import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/campaigns/[id] - Get campaign details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        influencers: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
                email: true,
                instagramHandle: true,
                instagramFollowers: true,
                tiktokHandle: true,
                tiktokFollowers: true,
              },
            },
          },
        },
        videos: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        coupons: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Calculate stats
    const totalViews = campaign.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalRevenue = campaign.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);
    const spent = campaign.influencers.reduce((sum, ci) => sum + (ci.agreedFee || 0), 0);

    return NextResponse.json({
      ...campaign,
      influencersCount: campaign.influencers.length,
      videosCount: campaign.videos.length,
      couponsCount: campaign.coupons.length,
      totalViews,
      totalRevenue,
      spent,
    });
  } catch (err: any) {
    console.error('[API ERROR] Fetching campaign:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: err?.message },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        budget: body.budget ? parseFloat(body.budget) : null,
        targetViews: body.targetViews ? parseInt(body.targetViews) : null,
        targetSales: body.targetSales ? parseInt(body.targetSales) : null,
        status: body.status,
      },
    });

    return NextResponse.json(campaign);
  } catch (err: any) {
    console.error('[API ERROR] Updating campaign:', err);
    return NextResponse.json(
      { error: 'Failed to update campaign', details: err?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API ERROR] Deleting campaign:', err);
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: err?.message },
      { status: 500 }
    );
  }
}
