import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { batchUpdateVideoMetrics } from '@/lib/apify-video-update';
import { logger } from '@/lib/logger';

// CRON job: Update video metrics daily by campaign
// Runs at 6 AM UTC daily
// Updates ALL videos for each active campaign

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[CRON] Starting daily video metrics update by campaign');

    // Get all active campaigns (ACTIVE or PAUSED status)
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'PAUSED'],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    logger.info(`[CRON] Found ${campaigns.length} active campaigns to process`);

    const results = [];

    for (const campaign of campaigns) {
      logger.info(`[CRON] Processing campaign: ${campaign.name} (${campaign.id})`);

      // Get ALL videos for this campaign (no limit)
      const videos = await prisma.video.findMany({
        where: {
          campaignId: campaign.id,
        },
        select: {
          id: true,
          url: true,
        },
        orderBy: {
          createdAt: 'desc', // Most recent first
        },
      });

      if (videos.length === 0) {
        logger.info(`[CRON] No videos found for campaign: ${campaign.name}`);
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalVideos: 0,
          updated: 0,
          failed: 0,
        });
        continue;
      }

      logger.info(`[CRON] Campaign ${campaign.name}: ${videos.length} videos to update`);

      // Get updated metrics from Apify for all videos
      const videoUrls = videos.map(v => v.url);
      const metricsMap = await batchUpdateVideoMetrics(videoUrls);

      // Update database for all videos
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
              campaignId: campaign.id,
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

          updatedCount++;
        } catch (error) {
          failedCount++;
          logger.error(`[CRON] Error updating video ${video.id}:`, error);
        }
      }

      logger.info(`[CRON] Campaign ${campaign.name}: ${updatedCount} updated, ${failedCount} failed`);

      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalVideos: videos.length,
        updated: updatedCount,
        failed: failedCount,
      });

      // Small delay between campaigns to avoid rate limits
      if (campaigns.indexOf(campaign) < campaigns.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s between campaigns
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalVideos = results.reduce((sum, r) => sum + r.totalVideos, 0);

    logger.info(`[CRON] All campaigns complete: ${totalUpdated} updated, ${totalFailed} failed, ${totalVideos} total videos`);

    return NextResponse.json({
      message: 'Video metrics update complete',
      campaignsProcessed: campaigns.length,
      totalVideos,
      totalUpdated,
      totalFailed,
      details: results,
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
