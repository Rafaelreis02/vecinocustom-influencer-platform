import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeHashtagVideos } from '@/lib/apify';
import { logger } from '@/lib/logger';
import { handleApiError, ApiError } from '@/lib/api-error';

// POST /api/campaigns/[id]/sync - Manual sync of campaign videos from hashtag
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch campaign and validate
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        hashtag: true,
        platform: true,
      }
    });

    if (!campaign) {
      throw new ApiError(404, 'Campanha não encontrada');
    }

    if (!campaign.hashtag) {
      throw new ApiError(400, 'Campanha não tem hashtag configurada');
    }

    if (campaign.platform !== 'TIKTOK') {
      throw new ApiError(400, 'Apenas plataforma TikTok é suportada');
    }

    logger.info(`[SYNC] Starting manual sync for campaign ${id}, hashtag: ${campaign.hashtag}`);

    // 2. Scrape hashtag videos
    let apifyVideos;
    try {
      apifyVideos = await scrapeHashtagVideos(campaign.hashtag, 30);
      logger.info(`[SYNC] Found ${apifyVideos.length} videos from Apify`);
    } catch (error: any) {
      logger.error('[SYNC] Apify error', error);
      throw new ApiError(500, 'Erro ao obter vídeos do TikTok', error.message);
    }

    // 3. Filter: brand account + hashtag verification
    const brandAccountsLower = ['vecino.custom'];
    const targetHashtag = campaign.hashtag.replace('#', '').toLowerCase();
    
    const filteredVideos = apifyVideos.filter((v: any) => {
      // Filter 1: Exclude brand accounts
      const authorHandle = v.authorMeta?.name?.toLowerCase() || '';
      if (brandAccountsLower.includes(authorHandle)) {
        return false;
      }
      
      // Filter 2: MUST contain the exact hashtag in description OR hashtags array
      const description = (v.text || v.description || '').toLowerCase();
      const hashtags = (v.hashtags || []).map((h: string) => h.toLowerCase());
      
      // Check if hashtag is in description (with #) or in hashtags array (without #)
      const hasHashtag = description.includes(`#${targetHashtag}`) || 
                         hashtags.includes(targetHashtag) ||
                         hashtags.some((h: string) => h === targetHashtag);
      
      if (!hasHashtag) {
        logger.debug(`[SYNC] Excluding video - no hashtag #${targetHashtag}: "${description.substring(0, 50)}..."`);
      }
      
      return hasHashtag;
    });
    
    const excludedCount = apifyVideos.length - filteredVideos.length;
    logger.info(`[SYNC] After filters: ${filteredVideos.length} videos (excluded ${excludedCount})`);

    // 4. Process each video - SKIP if video doesn't have the hashtag
    let skippedHashtag = 0;
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
          continue;
        }

        // Check if video exists
        const existingVideo = await prisma.video.findFirst({
          where: { url }
        });

        if (existingVideo) {
          // UPDATE metrics
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
        } else {
          // CREATE new video
          // Try to find influencer by tiktokHandle
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
              campaignId: id,
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
        }

      } catch (err: any) {
        logger.error('[SYNC] Video process error', err);
        // Continue processing others
      }
    }

    // 5. Create snapshots for ALL campaign videos
    await createDailySnapshots(id);

    logger.info(`[SYNC] Complete: ${createdCount} created, ${updatedCount} updated, ${excludedCount} excluded (hashtag filtered)`);

    return NextResponse.json({
      created: createdCount,
      updated: updatedCount,
      excluded: excludedCount,
      total: filteredVideos.length,
      message: `${createdCount} novos, ${updatedCount} atualizados, ${excludedCount} excluídos (sem hashtag)`,
    });

  } catch (error) {
    logger.error('[SYNC] Error', error);
    return handleApiError(error);
  }
}

// Helper: Create daily snapshots
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

    logger.info(`[SYNC] Snapshots created for ${campaignVideos.length} videos`);
  } catch (error: any) {
    logger.error('[SYNC] Snapshot error', error);
    // Non-critical, don't throw
  }
}
