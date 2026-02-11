import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// PUT /api/influencers/[id]/portal-fields - Update portal-specific fields (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Find the influencer first
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
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

    // Validate status advancement if status is being updated
    if (body.status) {
      const currentStatusIndex = statusOrder.indexOf(influencer.status);
      const newStatusIndex = statusOrder.indexOf(body.status);

      // Can only advance forward or stay same
      if (newStatusIndex !== -1 && newStatusIndex < currentStatusIndex) {
        return NextResponse.json(
          { error: 'Cannot move status backward' },
          { status: 400 }
        );
      }
    }

    // Prepare update data - only portal-related fields
    const updateData: Record<string, any> = {};
    
    const allowedFields = [
      'agreedPrice',
      'chosenProduct',
      'trackingUrl',
      'status',
    ] as const;

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the influencer
    const updatedInfluencer = await prisma.influencer.update({
      where: { id },
      data: updateData,
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
        },
        campaigns: {
          include: {
            campaign: true,
          },
        },
        coupons: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    // Calculate statistics (same as GET)
    const totalViews = updatedInfluencer.videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
    const totalLikes = updatedInfluencer.videos.reduce((sum: number, v: any) => sum + (v.likes || 0), 0);
    const totalComments = updatedInfluencer.videos.reduce((sum: number, v: any) => sum + (v.comments || 0), 0);
    const totalShares = updatedInfluencer.videos.reduce((sum: number, v: any) => sum + (v.shares || 0), 0);
    const totalRevenue = updatedInfluencer.coupons.reduce((sum: number, c: any) => sum + (c.totalSales || 0), 0);
    
    const totalFollowers = (updatedInfluencer.instagramFollowers || 0) + (updatedInfluencer.tiktokFollowers || 0);
    const engagementRate = totalFollowers > 0 
      ? ((totalLikes + totalComments + totalShares) / totalFollowers) * 100
      : 0;

    const result = serializeBigInt({
      ...updatedInfluencer,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalRevenue,
      avgEngagement: parseFloat(engagementRate.toFixed(2)),
      activeCoupons: updatedInfluencer.coupons.filter((c: any) => c.usageCount > 0).length,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('PUT /api/influencers/[id]/portal-fields failed', error);
    return handleApiError(error);
  }
}
