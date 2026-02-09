import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCoupon, getAllCoupons, testShopifyConnection } from '@/lib/shopify';

/**
 * GET /api/coupons
 * List all coupons from database
 */
export async function GET(request: NextRequest) {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            tiktokHandle: true,
            instagramHandle: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      coupons,
      count: coupons.length,
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coupons
 * Create a new coupon manually
 * Body: {
 *   code: "CUPOM_TESTE",
 *   discountValue: 10,  // 10% discount
 *   influencerId: "string",  // Required - which influencer this coupon is for
 *   validUntil?: "ISO date string"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discountValue, influencerId, validUntil } = body;

    // Validate required fields
    if (!code || typeof discountValue !== 'number' || !influencerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Code, discountValue, and influencerId are required',
        },
        { status: 400 }
      );
    }

    // Verify influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Influencer not found',
        },
        { status: 404 }
      );
    }

    // Create coupon in Shopify
    const shopifyResult = await createCoupon({
      title: `Cupom ${code} - ${influencer.name}`,
      code: code.toUpperCase(),
      discountPercentage: discountValue,
      expiresAt: validUntil,
    });

    if (!shopifyResult.success) {
      throw new Error('Failed to create coupon in Shopify');
    }

    // Save coupon to our database
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: 'PERCENTAGE',
        discountValue: discountValue,
        influencerId: influencerId,
        shopifyId: shopifyResult.coupon.id,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            tiktokHandle: true,
            instagramHandle: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
