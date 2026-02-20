import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeHashtagVideos } from '@/lib/apify';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error';

// POST /api/worker/analyze-hashtag - Extrai vídeos de hashtag com Apify
export async function POST(request: Request) {
  try {
    const { campaignId, hashtag, platform, excludeAccounts } = await request.json();

    if (!campaignId || !hashtag) {
      return NextResponse.json(
        { error: 'Missing campaignId or hashtag' },
        { status: 400 }
      );
    }

    // Only support TikTok for now (Apify hashtag scraper is TikTok-only)
    if (platform !== 'TIKTOK') {
      return NextResponse.json(
        { error: 'Only TikTok hashtag scraping is supported' },
        { status: 400 }
      );
    }

    logger.info(`[ANALYZE HASHTAG] Starting scrape: #${hashtag} for campaign ${campaignId}`);

    // 1. Scrape hashtag videos using Apify
    let apifyVideos;
    try {
      apifyVideos = await scrapeHashtagVideos(hashtag, 30);
      logger.info(`[ANALYZE HASHTAG] Found ${apifyVideos.length} videos from Apify`);
    } catch (error: any) {
      logger.error('[APIFY ERROR]', error);
      return NextResponse.json(
        { error: 'Failed to scrape hashtag', details: error.message },
        { status: 500 }
      );
    }

    if (apifyVideos.length === 0) {
      return NextResponse.json({
        created: 0,
        updated: 0,
        excluded: 0,
        total: 0,
        message: 'No videos found for hashtag'
      });
    }

    // 2. Filter out vecino.custom brand account (case-insensitive)
    const brandAccountsLower = ['vecino.custom', ...(excludeAccounts || [])].map((a: string) => a.toLowerCase());
    const filteredVideos = apifyVideos.filter((v: any) => {
      const authorHandle = v.authorMeta?.name?.toLowerCase() || '';
      return !brandAccountsLower.includes(authorHandle);
    });
    const brandExcludedCount = apifyVideos.length - filteredVideos.length;
    
    logger.info(`[ANALYZE HASHTAG] After brand filter: ${filteredVideos.length} videos (excluded ${brandExcludedCount})`);

    // 3. Process each video
    let createdCount = 0;
    let updatedCount = 0;

    for (const apifyVideo of filteredVideos) {
      try {
        // Extract data with correct ScrapedVideo type properties
        const url = apifyVideo.videoUrl;
        const authorHandle = apifyVideo.authorUsername || null;
        const authorDisplayName = authorHandle; // Use handle as display name for now
        const views = apifyVideo.viewCount || 0;
        const likes = apifyVideo.likeCount || 0;
        const comments = apifyVideo.commentCount || 0;
        const shares = apifyVideo.shareCount || 0;
        const description = apifyVideo.description || null;
        const publishedAt = apifyVideo.publishedAt || new Date();

        if (!url) {
          logger.warn('[ANALYZE HASHTAG] Skipping video without URL');
          continue;
        }

        // Check if video already exists (by URL)
        const existingVideo = await prisma.video.findFirst({
          where: { url }
        });

        if (existingVideo) {
          // UPDATE existing video metrics
          await prisma.video.update({
            where: { id: existingVideo.id },
            data: {
              views,
              likes,
              comments,
              shares,
              description,
            }
          });
          updatedCount++;
          logger.info(`[ANALYZE HASHTAG] Updated video: ${url}`);
        } else {
          // CREATE new video
          // Try to find existing influencer by tiktokHandle
          let influencerId: string | null = null;
          if (authorHandle) {
            const existingInfluencer = await prisma.influencer.findFirst({
              where: { tiktokHandle: authorHandle }
            });
            if (existingInfluencer) {
              influencerId = existingInfluencer.id;
            }
          }

          await prisma.video.create({
            data: {
              url,
              platform: 'TIKTOK',
              campaignId,
              influencerId,
              authorHandle,
              authorDisplayName,
              views,
              likes,
              comments,
              shares,
              description,
              publishedAt,
            }
          });
          createdCount++;
          logger.info(`[ANALYZE HASHTAG] Created video: ${url} by @${authorHandle}`);
        }

      } catch (err: any) {
        logger.error('[VIDEO PROCESS ERROR]', err);
        // Continue processing others
      }
    }

    // 4. Create snapshots for ALL videos in the campaign
    await createDailySnapshots(campaignId);

    logger.info(`[ANALYZE HASHTAG] Complete: ${createdCount} created, ${updatedCount} updated, ${brandExcludedCount} excluded`);

    return NextResponse.json({
      created: createdCount,
      updated: updatedCount,
      excluded: brandExcludedCount,
      total: filteredVideos.length,
      source: 'apify'
    });

  } catch (err: any) {
    logger.error('[ANALYZE HASHTAG ERROR]', err);
    return handleApiError(err);
  }
}

// Helper: Create daily snapshots for all videos in a campaign
async function createDailySnapshots(campaignId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const campaignVideos = await prisma.video.findMany({
      where: { campaignId },
      select: {
        id: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      }
    });

    logger.info(`[SNAPSHOTS] Creating snapshots for ${campaignVideos.length} videos`);

    for (const video of campaignVideos) {
      await prisma.campaignVideoSnapshot.upsert({
        where: {
          videoId_snapshotDate: {
            videoId: video.id,
            snapshotDate: today,
          }
        },
        create: {
          videoId: video.id,
          campaignId,
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          snapshotDate: today,
        },
        update: {
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
        }
      });
    }

    logger.info(`[SNAPSHOTS] Snapshots created successfully`);
  } catch (error: any) {
    logger.error('[SNAPSHOTS ERROR]', error);
    // Don't throw - snapshots are non-critical
  }
}
