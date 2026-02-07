import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/campaigns - List all campaigns
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        videos: {
          select: {
            id: true,
            views: true,
            cost: true,
            influencerId: true,
          },
        },
      },
    });

    // Calculate stats for each campaign
    const campaignsWithStats = campaigns.map(camp => {
      const totalViews = camp.videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const spent = camp.videos.reduce((sum, v) => sum + (v.cost || 0), 0);
      
      // Count unique influencers from videos
      const uniqueInfluencers = new Set(camp.videos.map(v => v.influencerId)).size;

      return {
        ...camp,
        influencersCount: uniqueInfluencers,
        videosCount: camp.videos.length,
        totalViews,
        spent,
      };
    });

    return NextResponse.json(campaignsWithStats);
  } catch (err: any) {
    console.error('[API ERROR] Fetching campaigns:', err);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: err?.message },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get default user (AI Agent)
    let defaultUser = await prisma.user.findUnique({
      where: { email: 'ai@vecinocustom.com' }
    });

    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'ai@vecinocustom.com',
          name: 'AI Agent 🤖',
          role: 'ADMIN'
        }
      });
    }

    const campaign = await prisma.campaign.create({
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
        createdById: defaultUser.id,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    console.error('[API ERROR] Creating campaign:', err);
    return NextResponse.json(
      { error: 'Failed to create campaign', details: err?.message },
      { status: 500 }
    );
  }
}
