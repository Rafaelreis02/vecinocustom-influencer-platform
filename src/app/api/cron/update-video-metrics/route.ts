import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { batchUpdateVideoMetrics } from '@/lib/apify-video-update';
import { logger } from '@/lib/logger';

// CRON job: Update video metrics daily
// Runs at 6 AM UTC daily

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[CRON] Starting daily video metrics update');

    // Get all videos that need updating (last 30 days, max 50 per run)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const videos = await prisma.video.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        url: true,
        platform: true,
        campaignId: true,
      },
      orderBy: {
        createdAt: 'desc', // Most recent videos first
      },
      take: 15, // Max 15 per run
    });

    logger.info(`[CRON] Found ${videos.length} videos to update (max 15, most recent first)`);

    if (videos.length === 0) {
      return NextResponse.json({ 
        message: 'No videos to update',
        updated: 0,
        failed: 0,
      });
    }

    // Get updated metrics from Apify
    const videoUrls = videos.map(v => v.url);
    const metricsMap = await batchUpdateVideoMetrics(videoUrls);

    // Update database
    let updatedCount = 0;
    let failedCount = 0;

    for (const video of videos) {
      const metrics = metricsMap.get(video.url);
      
      if (!metrics) {
        failedCount++;
        logger.warn(`[CRON] Failed to get metrics for video: ${video.id}`);
        continue;
      }

      try {
        await prisma.video.update({
          where: { id: video.id },
          data: {
            views: metrics.views,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            description: metrics.description,
            updatedAt: new Date(),
          },
        });

        // Create snapshot for tracking growth
        if (video.campaignId) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await prisma.campaignVideoSnapshot.upsert({
            where: {
              videoId_snapshotDate: {
                videoId: video.id,
                snapshotDate: today,
              },
            },
            create: {
              videoId: video.id,
              campaignId: video.campaignId,
              views: metrics.views || 0,
              likes: metrics.likes || 0,
              comments: metrics.comments || 0,
              shares: metrics.shares || 0,
              snapshotDate: today,
            },
            update: {
              views: metrics.views || 0,
              likes: metrics.likes || 0,
              comments: metrics.comments || 0,
              shares: metrics.shares || 0,
            },
          });
        }

        updatedCount++;
      } catch (error) {
        failedCount++;
        logger.error(`[CRON] Error updating video ${video.id}:`, error);
      }
    }

    logger.info(`[CRON] Update complete: ${updatedCount} updated, ${failedCount} failed`);

    return NextResponse.json({
      message: 'Video metrics update complete',
      total: videos.length,
      updated: updatedCount,
      failed: failedCount,
    });

  } catch (error) {
    logger.error('[CRON] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
