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

// POST /api/videos - Create new video
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.url || !body.influencerId) {
      return NextResponse.json(
        { error: 'URL and influencerId are required' },
        { status: 400 }
      );
    }

    const video = await prisma.video.create({
      data: {
        url: body.url,
        title: body.title || null,
        platform: body.platform || 'TIKTOK',
        influencerId: body.influencerId,
        campaignId: body.campaignId || null,
        views: body.views ? parseInt(body.views) : null,
        likes: body.likes ? parseInt(body.likes) : null,
        comments: body.comments ? parseInt(body.comments) : null,
        shares: body.shares ? parseInt(body.shares) : null,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            tiktokHandle: true,
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

    return NextResponse.json(video, { status: 201 });
  } catch (err: any) {
    console.error('[API ERROR] Creating video:', err);
    return NextResponse.json(
      { error: 'Failed to create video', details: err?.message },
      { status: 500 }
    );
  }
}
