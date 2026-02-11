import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const AnalyzeSchema = z.object({
  influencerId: z.string().min(1),
});

// POST /api/worker/analyze-influencer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { influencerId } = AnalyzeSchema.parse(body);

    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Calculate engagement metrics
    const totalViews = influencer.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = influencer.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = influencer.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
    const totalShares = influencer.videos.reduce((sum, v) => sum + (v.shares || 0), 0);

    const followers = (influencer.tiktokFollowers || 0) + (influencer.instagramFollowers || 0);
    const engagementRate = followers > 0
      ? ((totalLikes + totalComments + totalShares) / followers) * 100
      : 0;

    const avgViews = influencer.videos.length > 0
      ? totalViews / influencer.videos.length
      : 0;

    // Update influencer with calculated metrics
    await prisma.influencer.update({
      where: { id: influencerId },
      data: {
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        averageViews: avgViews > 1000000 
          ? `${(avgViews / 1000000).toFixed(1)}M`
          : avgViews > 1000
          ? `${(avgViews / 1000).toFixed(1)}K`
          : avgViews.toFixed(0),
        status: 'SUGGESTION', // Move to suggestion after analysis
      },
    });

    logger.info('Influencer analyzed', { id: influencerId, engagementRate });

    return NextResponse.json({
      success: true,
      metrics: {
        engagementRate,
        avgViews,
        totalViews,
      },
    });
  } catch (error) {
    logger.error('POST /api/worker/analyze-influencer failed', error);
    return handleApiError(error);
  }
}
