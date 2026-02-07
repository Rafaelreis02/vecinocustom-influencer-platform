import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        videos: {
          select: {
            id: true,
            title: true,
            url: true,
            platform: true,
            views: true,
            likes: true,
            comments: true,
            shares: true,
            cost: true,
            publishedAt: true,
            influencerId: true,
            influencer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            publishedAt: 'desc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
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
    const spent = campaign.videos.reduce((sum, v) => sum + (v.cost || 0), 0);
    const uniqueInfluencers = new Set(campaign.videos.map(v => v.influencerId)).size;

    return NextResponse.json({
      ...campaign,
      totalViews,
      spent,
      influencersCount: uniqueInfluencers,
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        platform: body.platform || null,
        hashtag: body.hashtag || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        budget: body.budget ? parseFloat(body.budget) : null,
        targetViews: body.targetViews ? parseInt(body.targetViews) : null,
        targetSales: body.targetSales ? parseInt(body.targetSales) : null,
        status: body.status || 'DRAFT',
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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
