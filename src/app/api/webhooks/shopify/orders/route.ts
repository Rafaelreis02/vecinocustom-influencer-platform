/**
 * POST /api/webhooks/shopify/orders
 * 
 * Webhook da Shopify para quando nova venda é feita
 * Disparado quando: orders/created, orders/updated
 * 
 * Flow:
 * 1. Venda na loja Shopify
 * 2. Shopify envia POST para este endpoint
 * 3. Verificamos se tem cupão/desconto
 * 4. Calculamos comissão
 * 5. Criamos Payment record IMEDIATAMENTE
 * 6. Admin vê no dashboard em tempo real!
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/lib/retry';
import crypto from 'crypto';

interface ShopifyOrder {
  id: string;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping: string;
  discount_codes?: Array<{
    code: string;
    amount: string;
  }>;
  line_items: Array<{
    id: string;
    title: string;
    price: string;
  }>;
}

/**
 * Verificar assinatura do webhook (segurança)
 * Garante que é realmente Shopify a enviar
 */
function verifyShopifySignature(
  request: NextRequest,
  body: string
): boolean {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !webhookSecret) {
    logger.warn('[Shopify Webhook] Missing HMAC or secret');
    return false;
  }

  const hmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('base64');

  return hmac === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    // Ler body como text (para verificar signature)
    const rawBody = await request.text();

    // Verificar assinatura (segurança!)
    if (!verifyShopifySignature(request, rawBody)) {
      logger.warn('[Shopify Webhook] Invalid signature - possible forgery');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse JSON
    const order: ShopifyOrder = JSON.parse(rawBody);

    logger.info('[Shopify Webhook] Order received', {
      orderId: order.id,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      discountCodes: order.discount_codes?.map(d => d.code),
    });

    // Se não tem cupom, nada para fazer
    if (!order.discount_codes || order.discount_codes.length === 0) {
      logger.info('[Shopify Webhook] No discount codes - skipping');
      return NextResponse.json({ processed: false, reason: 'no_discount' });
    }

    // Processar cada cupom/desconto
    for (const discount of order.discount_codes) {
      await retryWithExponentialBackoff(
        async () => {
          // Procurar cupom no BD
          const coupon = await prisma.coupon.findUnique({
            where: { code: discount.code.toUpperCase() },
            include: { influencer: true },
          });

          if (!coupon || !coupon.influencer) {
            logger.info('[Shopify Webhook] Coupon not found or no influencer', {
              code: discount.code,
            });
            return;
          }

          // Calcular comissão
          const totalPrice = parseFloat(order.total_price);
          const totalTax = parseFloat(order.total_tax);
          const totalShipping = parseFloat(order.total_shipping);

          const base = totalPrice - totalTax - totalShipping;
          const commission = base * (coupon.commissionRate / 100);

          logger.info('[Shopify Webhook] Calculating commission', {
            code: discount.code,
            base,
            commissionRate: coupon.commissionRate,
            commission,
          });

          // Criar payment record (ou atualizar se já existe para hoje)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingPayment = await prisma.payment.findFirst({
            where: {
              influencerId: coupon.influencerId,
              status: 'PENDING',
              description: {
                contains: `Comissão cupão ${coupon.code}`,
              },
              createdAt: {
                gte: today,
              },
            },
          });

          if (existingPayment) {
            // Atualizar payment existente (acumular)
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                amount: parseFloat(existingPayment.amount.toString()) + commission,
                description: `${existingPayment.description} + Venda #${order.order_number}`,
              },
            });

            logger.info('[Shopify Webhook] Payment updated', {
              paymentId: existingPayment.id,
              newAmount: parseFloat(existingPayment.amount.toString()) + commission,
            });
          } else {
            // Criar novo payment
            await prisma.payment.create({
              data: {
                influencerId: coupon.influencerId,
                amount: commission,
                currency: 'EUR',
                description: `Comissão cupão ${coupon.code} - Venda #${order.order_number}`,
                status: 'PENDING',
              },
            });

            logger.info('[Shopify Webhook] Payment created', {
              influencerId: coupon.influencerId,
              amount: commission,
              orderId: order.id,
            });
          }

          // Atualizar stats do cupom
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: {
              usageCount: { increment: 1 },
              totalSales: { increment: base },
              totalOrders: { increment: 1 },
            },
          });
        },
        3,
        500,
        `Processing discount code ${discount.code}`
      );
    }

    // Retornar sucesso
    return NextResponse.json({
      processed: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });

  } catch (error) {
    logger.error('[Shopify Webhook] Error processing order', { error });
    // Retornar 2xx mesmo com erro (Shopify quer 2xx)
    return NextResponse.json({ received: true });
  }
}
