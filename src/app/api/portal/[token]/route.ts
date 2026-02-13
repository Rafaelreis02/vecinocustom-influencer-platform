import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/portal/[token] - Fetch influencer data by portalToken
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      include: {
        coupons: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Get the coupon code if exists
    const couponCode = influencer.coupons[0]?.code || null;

    // Return only the fields needed for the portal
    const result = serializeBigInt({
      id: influencer.id,
      name: influencer.name,
      email: influencer.email,
      instagramHandle: influencer.instagramHandle,
      tiktokHandle: influencer.tiktokHandle,
      phone: influencer.phone,
      ddiCode: influencer.ddiCode,
      agreedPrice: influencer.agreedPrice,
      status: influencer.status,
      shippingAddress: influencer.shippingAddress,
      productSuggestion1: influencer.productSuggestion1,
      productSuggestion2: influencer.productSuggestion2,
      productSuggestion3: influencer.productSuggestion3,
      chosenProduct: influencer.chosenProduct,
      trackingUrl: influencer.trackingUrl,
      couponCode,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('GET /api/portal/[token] failed', error);
    return handleApiError(error);
  }
}

// PUT /api/portal/[token] - Update influencer data from portal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Find the influencer
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Define status order for validation
    const statusOrder = [
      'UNKNOWN',
      'COUNTER_PROPOSAL',
      'ANALYZING',
      'AGREED',
      'PRODUCT_SELECTION',
      'CONTRACT_PENDING',
      'SHIPPED',
    ];

    const currentStatusIndex = statusOrder.indexOf(influencer.status);
    const newStatusIndex = body.status ? statusOrder.indexOf(body.status) : -1;

    // Validate status can only move forward
    if (newStatusIndex !== -1 && newStatusIndex < currentStatusIndex) {
      return NextResponse.json(
        { error: 'Cannot move status backward' },
        { status: 400 }
      );
    }

    // If status is ANALYZING or beyond, personal fields cannot be changed
    if (currentStatusIndex >= statusOrder.indexOf('ANALYZING')) {
      const personalFields = ['name', 'email', 'instagramHandle', 'tiktokHandle', 'phone', 'ddiCode'];
      const isAttemptingPersonalChange = personalFields.some(field => 
        body[field] !== undefined && body[field] !== (influencer as any)[field]
      );
      
      if (isAttemptingPersonalChange) {
        return NextResponse.json(
          { error: 'Personal information cannot be changed at this stage' },
          { status: 400 }
        );
      }
    }

    // If status is PRODUCT_SELECTION or beyond, shipping/product fields cannot be changed
    if (currentStatusIndex >= statusOrder.indexOf('PRODUCT_SELECTION')) {
      const shippingFields = ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'];
      const isAttemptingShippingChange = shippingFields.some(field => 
        body[field] !== undefined && body[field] !== (influencer as any)[field]
      );
      
      if (isAttemptingShippingChange) {
        return NextResponse.json(
          { error: 'Shipping and product information cannot be changed at this stage' },
          { status: 400 }
        );
      }
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    const allowedFields = [
      'name',
      'instagramHandle',
      'tiktokHandle',
      'phone',
      'ddiCode',
      'agreedPrice',
      'shippingAddress',
      'productSuggestion1',
      'productSuggestion2',
      'productSuggestion3',
      'chosenProduct',
      'trackingUrl',
      'status',
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Update the influencer
    const updatedInfluencer = await prisma.influencer.update({
      where: { portalToken: token },
      data: updateData,
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        status: updatedInfluencer.status,
      })
    );
  } catch (error) {
    logger.error('PUT /api/portal/[token] failed', error);
    return handleApiError(error);
  }
}
