import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrdersByDiscountCode } from '@/lib/shopify-oauth';

/**
 * GET /api/cron/sync-commissions
 * Vercel Cron job to sync commissions from Shopify orders
 * Protected by CRON_SECRET
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
        shopifyPriceRuleId: {
          not: null,
        },
      },
      include: {
        influencer: true,
      },
    });

    console.log(`[CRON] Processing ${coupons.length} coupons...`);

    const results = [];

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

        // Calculate totals
        let totalSales = 0;
        let totalCommission = 0;
        const orderCount = orders.length;

        for (const order of orders) {
          // Calculate base = total_price - total_tax - total_shipping
          const totalPrice = parseFloat(order.total_price);
          const totalTax = parseFloat(order.total_tax);
          const totalShipping = parseFloat(order.total_shipping || '0');
          
          const base = totalPrice - totalTax - totalShipping;
          totalSales += base;

          // Calculate commission
          if (coupon.commissionRate) {
            const commission = base * (coupon.commissionRate / 100);
            totalCommission += commission;
          }
        }

        // Update coupon statistics
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: {
            totalSales: totalSales,
            totalOrders: orderCount,
            usageCount: orderCount,
          },
        });

        // Create or update payment record for commission
        if (totalCommission > 0) {
          // Check if payment already exists for this period
          const existingPayment = await prisma.payment.findFirst({
            where: {
              influencerId: coupon.influencerId,
              description: {
                contains: `Comissão cupão ${coupon.code}`,
              },
              status: 'PENDING',
            },
          });

          if (existingPayment) {
            // Update existing payment
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                amount: totalCommission,
                description: `Comissão cupão ${coupon.code} (${orderCount} vendas)`,
              },
            });
          } else {
            // Create new payment
            await prisma.payment.create({
              data: {
                influencerId: coupon.influencerId,
                amount: totalCommission,
                currency: 'EUR',
                description: `Comissão cupão ${coupon.code} (${orderCount} vendas)`,
                status: 'PENDING',
                method: coupon.influencer.paymentMethod || 'BANK_TRANSFER',
              },
            });
          }
        }

        results.push({
          coupon: coupon.code,
          orders: orderCount,
          totalSales: totalSales.toFixed(2),
          commission: totalCommission.toFixed(2),
          status: 'success',
        });

        console.log(
          `[CRON] ${coupon.code}: ${orderCount} orders, €${totalSales.toFixed(2)} sales, €${totalCommission.toFixed(2)} commission`
        );
      } catch (error) {
        console.error(`[CRON] Error processing coupon ${coupon.code}:`, error);
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
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error in sync-commissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
