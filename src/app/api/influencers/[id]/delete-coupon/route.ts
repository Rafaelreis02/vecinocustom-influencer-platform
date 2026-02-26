import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteCoupon, getCouponByCode } from '@/lib/shopify';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/influencers/[id]/delete-coupon
 * Delete a coupon from Shopify
 * Body: { code: "VECINO_JOAO_10" }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check Shopify configuration
    if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Shopify not configured' },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // Fetch influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Find coupon in database
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Delete from Shopify if shopifyId exists
    if (coupon.shopifyId) {
      try {
        await deleteCoupon(coupon.shopifyId);
        logger.info(`Coupon ${code.toUpperCase()} deleted from Shopify`);
      } catch (shopifyError: any) {
        // If coupon not found in Shopify, continue (maybe already deleted)
        if (!shopifyError.message?.includes('not found')) {
          throw shopifyError;
        }
        logger.warn(`Coupon ${code.toUpperCase()} not found in Shopify, marking as deleted locally`);
      }
    }

    // Delete from database
    await prisma.coupon.delete({
      where: { id: coupon.id },
    });

    logger.info(`Coupon ${code.toUpperCase()} deleted for influencer ${influencer.name}`);

    return NextResponse.json({
      success: true,
      message: `Cupom ${code.toUpperCase()} revogado com sucesso!`,
    });
  } catch (error) {
    logger.error('POST /api/influencers/[id]/delete-coupon failed', error);
    return handleApiError(error);
  }
}
