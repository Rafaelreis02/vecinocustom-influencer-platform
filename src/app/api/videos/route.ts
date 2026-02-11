import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VideoCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

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
    
    // Handle tiktokHandle if provided (from AddVideoModal)
    if (body.tiktokHandle && !body.influencerId) {
      // Try to find existing influencer by tiktokHandle
      const existingInfluencer = await prisma.influencer.findFirst({
        where: { tiktokHandle: body.tiktokHandle }
      });
      
      if (existingInfluencer) {
        body.influencerId = existingInfluencer.id;
      } else {
        // Set authorHandle but don't create influencer
        body.authorHandle = body.tiktokHandle;
        body.authorDisplayName = body.influencerName || body.tiktokHandle;
      }
    }
    
    // Remove non-schema fields before validation
    const { tiktokHandle, influencerName, ...validationData } = body;
    
    const validated = VideoCreateSchema.parse(validationData);

    const video = await prisma.video.create({
      data: validated,
    });

    logger.info('Video created', { id: video.id });
    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    logger.error('POST /api/videos failed', error);
    return handleApiError(error);
  }
}
