import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/videos - List videos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const influencerId = searchParams.get('influencerId');

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (influencerId) where.influencerId = influencerId;

    const videos = await prisma.video.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            tiktokHandle: true,
            instagramHandle: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(videos);
  } catch (err: any) {
    console.error('[API ERROR] Fetching videos:', err);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: err?.message },
      { status: 500 }
    );
  }
}

// POST /api/videos - Create new video (auto-creates influencer if needed)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let influencerId = body.influencerId;

    // Auto-create influencer if tiktokHandle or instagramHandle provided
    if (!influencerId && (body.tiktokHandle || body.instagramHandle)) {
      const handle = body.tiktokHandle || body.instagramHandle;
      const handleField = body.tiktokHandle ? 'tiktokHandle' : 'instagramHandle';

      // Check if influencer already exists
      const existing = await prisma.influencer.findFirst({
        where: { [handleField]: handle },
      });

      if (existing) {
        influencerId = existing.id;
      } else {
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

        // Create new influencer
        const newInfluencer = await prisma.influencer.create({
          data: {
            name: body.influencerName || handle,
            [handleField]: handle,
            status: 'SUGGESTION',
            primaryPlatform: body.platform || 'TIKTOK',
            discoveryMethod: `Video with ${body.campaignHashtag || 'hashtag'}`,
            discoveryDate: new Date(),
            createdById: defaultUser.id,
          },
        });

        influencerId = newInfluencer.id;
      }
    }

    if (!influencerId) {
      return NextResponse.json(
        { error: 'influencerId or tiktokHandle/instagramHandle required' },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        url: body.url,
        title: body.title || null,
        platform: body.platform || 'TIKTOK',
        influencerId,
        campaignId: body.campaignId || null,
        views: body.views ? parseInt(body.views) : null,
        likes: body.likes ? parseInt(body.likes) : null,
        comments: body.comments ? parseInt(body.comments) : null,
        shares: body.shares ? parseInt(body.shares) : null,
        cost: body.cost ? parseFloat(body.cost) : null,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
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
        campaign: {
          select: {
            id: true,
            name: true,
            hashtag: true,
          },
        },
      },
    });

    // If campaign provided, auto-add influencer to campaign
    if (body.campaignId && influencerId) {
      const existingLink = await prisma.campaignInfluencer.findUnique({
        where: {
          campaignId_influencerId: {
            campaignId: body.campaignId,
            influencerId,
          },
        },
      });

      if (!existingLink) {
        await prisma.campaignInfluencer.create({
          data: {
            campaignId: body.campaignId,
            influencerId,
            status: 'pending',
          },
        });
      }
    }

    return NextResponse.json(video, { status: 201 });
  } catch (err: any) {
    console.error('[API ERROR] Creating video:', err);
    return NextResponse.json(
      { error: 'Failed to create video', details: err?.message },
      { status: 500 }
    );
  }
}
