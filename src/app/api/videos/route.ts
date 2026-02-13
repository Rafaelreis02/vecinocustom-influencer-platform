import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VideoCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { linkInfluencerToVideo } from '@/lib/video-linker';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');
    const campaignId = searchParams.get('campaignId');

    const videos = await prisma.video.findMany({
      where: {
        ...(influencerId && { influencerId }),
        ...(campaignId && { campaignId }),
      },
      orderBy: { publishedAt: 'desc' },
      include: {
        influencer: {
          select: {
            name: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(videos);
  } catch (error) {
    logger.error('GET /api/videos failed', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle tiktokHandle/instagramHandle if provided (from AddVideoModal)
    let handleToLink: string | null = null;
    let platformToLink: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' = 'TIKTOK';
    
    if (body.tiktokHandle && !body.influencerId) {
      handleToLink = body.tiktokHandle;
      platformToLink = 'TIKTOK';
      // Set authorHandle but don't create influencer yet
      body.authorHandle = body.tiktokHandle.replace(/^@/, '');
      body.authorDisplayName = body.influencerName || body.tiktokHandle;
    } else if (body.instagramHandle && !body.influencerId) {
      handleToLink = body.instagramHandle;
      platformToLink = 'INSTAGRAM';
      body.authorHandle = body.instagramHandle.replace(/^@/, '');
      body.authorDisplayName = body.influencerName || body.instagramHandle;
    }
    
    // Remove non-schema fields before validation
    const { tiktokHandle, instagramHandle, influencerName, ...validationData } = body;
    
    const validated = VideoCreateSchema.parse(validationData);

    const video = await prisma.video.create({
      data: validated,
    });

    logger.info('Video created', { id: video.id });

    // Try to auto-link to existing influencer
    if (handleToLink && !video.influencerId) {
      const linked = await linkInfluencerToVideo(video.id, handleToLink, platformToLink);
      if (linked) {
        // Refetch video with updated data
        const updatedVideo = await prisma.video.findUnique({
          where: { id: video.id },
          include: {
            influencer: { select: { id: true, name: true } },
          },
        });
        return NextResponse.json(updatedVideo, { status: 201 });
      }
    }

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    logger.error('POST /api/videos failed', error);
    return handleApiError(error);
  }
}
