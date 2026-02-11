import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CouponCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    logger.error('GET /api/coupons failed', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CouponCreateSchema.parse(body);

    const coupon = await prisma.coupon.create({
      data: validated,
    });

    logger.info('Coupon created', { code: coupon.code });
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    logger.error('POST /api/coupons failed', error);
    return handleApiError(error);
  }
}
