/**
 * GET /api/cron/sync-commissions-v2
 * 
 * Nova versão: Cria comissões individuais por encomenda
 * Cada encomenda = 1 Payment record
 * Permite aprovar/rejeitar encomenda a encomenda
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrdersByDiscountCode } from '@/lib/shopify-oauth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/sync-commissions-v2
 * 
 * Vercel Cron job para sincronizar comissões da Shopify
 * Cada encomenda vira um registo de comissão individual
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active coupons
    const coupons = await prisma.coupon.findMany({
      where: {
        shopifyPriceRuleId: { not: null },
      },
      include: {
        influencer: true,
      },
    });

    console.log(`[CRON-V2] Processing ${coupons.length} coupons...`);
    logger.info('[CRON-V2] Starting commission sync', { couponCount: coupons.length });

    const results = [];
    let totalNewCommissions = 0;
    let totalExistingCommissions = 0;

    for (const coupon of coupons) {
      try {
        // Fetch orders from Shopify
        const orders = await getOrdersByDiscountCode(coupon.code);

        if (orders.length === 0) {
          results.push({
            coupon: coupon.code,
            orders: 0,
            status: 'no_orders',
          });
          continue;
        }

        console.log(`[CRON-V2] ${coupon.code}: ${orders.length} orders found`);

        // Process each order individually
        let newOrdersForThisCoupon = 0;
        let existingOrdersForThisCoupon = 0;

        for (const order of orders) {
          // Use Shopify order ID as unique identifier
          const shopifyOrderId = order.id.toString();
          
          // Check if this order commission already exists
          const existingCommission = await prisma.payment.findFirst({
            where: {
              influencerId: coupon.influencerId,
              description: {
                contains: `Encomenda #${order.name}`,
              },
            },
          });

          if (existingCommission) {
            existingOrdersForThisCoupon++;
            continue; // Skip existing
          }

          // Calculate commission for this specific order
          const totalPrice = parseFloat(order.total_price);
          const totalTax = parseFloat(order.total_tax);
          const totalShipping = parseFloat(order.total_shipping || '0');
          const base = totalPrice - totalTax - totalShipping;
          
          let commissionAmount = 0;
          if (coupon.commissionRate) {
            commissionAmount = base * (coupon.commissionRate / 100);
          }

          // Create individual commission record
          await prisma.payment.create({
            data: {
              influencerId: coupon.influencerId,
              amount: commissionAmount,
              currency: 'EUR',
              description: `Comissão Encomenda #${order.name} | Cupão: ${coupon.code} | Cliente: ${order.email || 'N/A'} | Valor: €${base.toFixed(2)}`,
              status: 'PENDING',
              method: coupon.influencer.paymentMethod || 'BANK_TRANSFER',
              // Store order details in reference field (JSON)
              reference: JSON.stringify({
                shopifyOrderId: shopifyOrderId,
                orderName: order.name,
                orderDate: order.created_at,
                customerEmail: order.email,
                totalAmount: totalPrice,
                baseAmount: base,
                commissionRate: coupon.commissionRate,
                couponCode: coupon.code,
              }),
            },
          });

          newOrdersForThisCoupon++;
          totalNewCommissions++;
        }

        // Update coupon statistics (aggregated)
        const totalSales = orders.reduce((sum, o) => {
          const base = parseFloat(o.total_price) - parseFloat(o.total_tax) - parseFloat(o.total_shipping || '0');
          return sum + base;
        }, 0);

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: {
            totalSales: totalSales,
            totalOrders: orders.length,
            usageCount: orders.length,
          },
        });

        results.push({
          coupon: coupon.code,
          orders: orders.length,
          newCommissions: newOrdersForThisCoupon,
          existingCommissions: existingOrdersForThisCoupon,
          status: 'success',
        });

        logger.info('[CRON-V2] Coupon processed', {
          coupon: coupon.code,
          new: newOrdersForThisCoupon,
          existing: existingOrdersForThisCoupon,
        });

      } catch (error) {
        console.error(`[CRON-V2] Error processing coupon ${coupon.code}:`, error);
        logger.error('[CRON-V2] Coupon processing failed', { 
          coupon: coupon.code, 
          error: error instanceof Error ? error.message : 'Unknown' 
        });
        results.push({
          coupon: coupon.code,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: coupons.length,
      newCommissions: totalNewCommissions,
      existingCommissions: totalExistingCommissions,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON-V2] Fatal error:', error);
    logger.error('[CRON-V2] Fatal error', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
