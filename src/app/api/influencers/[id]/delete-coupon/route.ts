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
      // If not in database but user wants to clear it, just return success
      logger.warn(`Coupon ${code.toUpperCase()} not found in DB, may be already deleted`);
      return NextResponse.json({
        success: true,
        message: `Cupom ${code.toUpperCase()} não encontrado na BD (já pode ter sido removido)`,
      });
    }

    // Delete from Shopify if shopifyId exists
    if (coupon.shopifyId) {
      try {
        await deleteCoupon(coupon.shopifyId);
        logger.info(`Coupon ${code.toUpperCase()} deleted from Shopify`);
      } catch (shopifyError: any) {
        // If coupon not found in Shopify, continue (maybe already deleted)
        if (!shopifyError.message?.includes('not found') && !shopifyError.message?.includes('not exist')) {
          throw shopifyError;
        }
        logger.warn(`Coupon ${code.toUpperCase()} not found in Shopify, deleting from DB only`);
      }
    } else {
      // No shopifyId means it was never created in Shopify (ghost coupon)
      logger.warn(`Coupon ${code.toUpperCase()} has no shopifyId, deleting from DB only`);
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
