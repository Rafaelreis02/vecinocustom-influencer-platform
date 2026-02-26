import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCoupon } from '@/lib/shopify';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * POST /api/influencers/[id]/create-coupon
 * Create a coupon for an influencer and send email notification
 * Body: { code: "VECINO_JOAO_10" }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check Shopify configuration
    if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Shopify not configured. Please contact admin.' },
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

    // Check if coupon already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: 'Este código de cupom já existe' },
        { status: 400 }
      );
    }

    // Create coupon in Shopify (10% discount)
    const shopifyResult = await createCoupon({
      title: `Cupom ${code} - ${influencer.name}`,
      code: code.toUpperCase(),
      discountPercentage: 10,
    });

    if (!shopifyResult.success) {
      throw new Error('Failed to create coupon in Shopify');
    }

    // Save coupon to database
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: 'PERCENTAGE',
        discountValue: 10,
        influencerId: id,
        shopifyId: shopifyResult.coupon.id,
      },
      include: {
        influencer: true,
      },
    });

    // Send email to influencer (optional - requires email service configuration)
    logger.info(`Coupon ${code.toUpperCase()} created for influencer ${influencer.name}`);

    return NextResponse.json({
      success: true,
      coupon,
      message: ` Cupom ${code.toUpperCase()} criado com sucesso!`,
    });
  } catch (error) {
    logger.error('POST /api/influencers/[id]/create-coupon failed', error);
    return handleApiError(error);
  }
}
