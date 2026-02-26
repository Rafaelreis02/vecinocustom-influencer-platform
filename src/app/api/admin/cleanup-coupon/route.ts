import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/cleanup-coupon
 * Remove a coupon from database if it's stuck (not in Shopify)
 * Body: { code: "VECINO_NAME_10" }
 */
export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();
    const { code, influencerId } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    // Find coupon in database
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found in database' },
        { status: 404 }
      );
    }

    // Delete the coupon
    await prisma.coupon.delete({
      where: { id: coupon.id },
    });

    // Also clear from workflow if provided
    if (influencerId) {
      await prisma.$executeRaw`
        UPDATE "partnership_workflows" 
        SET "couponCode" = NULL 
        WHERE "influencerId" = ${influencerId} 
        AND "couponCode" = ${code.toUpperCase()}
      `;
    }

    logger.info(`Cleaned up stuck coupon: ${code.toUpperCase()}`);

    return NextResponse.json({
      success: true,
      message: `Cupom ${code.toUpperCase()} removido da base de dados`,
    });
  } catch (error: any) {
    logger.error('Error cleaning up coupon:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup: ' + error.message },
      { status: 500 }
    );
  }
}
