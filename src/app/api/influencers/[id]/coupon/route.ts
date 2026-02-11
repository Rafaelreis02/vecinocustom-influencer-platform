import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createShopifyCoupon, deleteShopifyCoupon } from '@/lib/shopify-oauth';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/influencers/[id]/coupon
 * Create a coupon for an influencer in Shopify and DB
 * Body: { code: string, discountPercent: number, commissionPercent: number }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { code, discountPercent, commissionPercent } = body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Código é obrigatório' },
        { status: 400 }
      );
    }

    if (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentagem de desconto inválida (0-100)' },
        { status: 400 }
      );
    }

    if (typeof commissionPercent !== 'number' || commissionPercent < 0 || commissionPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentagem de comissão inválida (0-100)' },
        { status: 400 }
      );
    }

    // Fetch influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        coupons: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, error: 'Influencer não encontrado' },
        { status: 404 }
      );
    }

    // Check if influencer already has an active coupon
    if (influencer.coupons && influencer.coupons.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Apague o cupão atual primeiro' },
        { status: 400 }
      );
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Este código de cupão já existe' },
        { status: 400 }
      );
    }

    // Create coupon in Shopify
    let shopifyResult;
    try {
      shopifyResult = await createShopifyCoupon(
        code.toUpperCase(),
        discountPercent
      );
    } catch (error) {
      logger.error('Shopify coupon creation failed', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao criar cupão no Shopify: ' + 
            (error instanceof Error ? error.message : 'Erro desconhecido'),
        },
        { status: 500 }
      );
    }

    // Save coupon to database
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: 'PERCENTAGE',
        discountValue: discountPercent,
        commissionRate: commissionPercent,
        influencerId: id,
        shopifyPriceRuleId: shopifyResult.priceRuleId,
        shopifyDiscountCodeId: shopifyResult.discountCodeId,
      },
      include: {
        influencer: true,
      },
    });

    return NextResponse.json({
      success: true,
      coupon,
      message: ` Cupão ${code.toUpperCase()} criado com sucesso!`,
    });
  } catch (error) {
    logger.error('POST /api/influencers/[id]/coupon failed', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/influencers/[id]/coupon
 * Delete the active coupon for an influencer from Shopify and DB
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Find influencer with active coupon
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        coupons: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, error: 'Influencer não encontrado' },
        { status: 404 }
      );
    }

    if (!influencer.coupons || influencer.coupons.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum cupão ativo para apagar' },
        { status: 400 }
      );
    }

    const coupon = influencer.coupons[0];

    // Delete from Shopify if it has a price rule ID
    if (coupon.shopifyPriceRuleId) {
      try {
        await deleteShopifyCoupon(coupon.shopifyPriceRuleId);
      } catch (error) {
        logger.error('Failed to delete from Shopify', error);
        // Continue to delete from DB even if Shopify fails
      }
    }

    // Delete from database
    await prisma.coupon.delete({
      where: { id: coupon.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Cupão apagado com sucesso',
    });
  } catch (error) {
    logger.error('DELETE /api/influencers/[id]/coupon failed', error);
    return handleApiError(error);
  }
}
