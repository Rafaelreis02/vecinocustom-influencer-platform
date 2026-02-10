import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeHashtagVideos } from '@/lib/apify-fetch';

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

    console.log(`[ANALYZE HASHTAG] Starting scrape: #${hashtag} for campaign ${campaignId}`);

    // 1. Scrape hashtag videos using Apify
    let videos;
    try {
      videos = await scrapeHashtagVideos(hashtag, 30);
      console.log(`[ANALYZE HASHTAG] Found ${videos.length} videos from Apify`);
    } catch (error: any) {
      console.error('[APIFY ERROR]', error.message);
      return NextResponse.json(
        { error: 'Failed to scrape hashtag', details: error.message },
        { status: 500 }
      );
    }

    if (videos.length === 0) {
      return NextResponse.json({
        newVideos: 0,
        skipped: 0,
        excludedBrand: 0,
        message: 'No videos found for hashtag'
      });
    }

    // Filter out brand's own account videos
    const brandAccountsLower = (excludeAccounts || []).map((a: string) => a.toLowerCase());
    const filteredVideos = videos.filter((v) => 
      !brandAccountsLower.includes(v.authorUsername.toLowerCase())
    );
    const brandExcludedCount = videos.length - filteredVideos.length;
    
    console.log(`[ANALYZE HASHTAG] After brand filter: ${filteredVideos.length} videos (excluded ${brandExcludedCount})`);

    // 2. Process each video
    let newCount = 0;
    let skippedCount = 0;

    for (const videoData of filteredVideos) {
      try {
        // Check if video already exists (by URL)
        const existing = await prisma.video.findFirst({
          where: { url: videoData.videoUrl }
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Find or create influencer
        let influencer = await prisma.influencer.findFirst({
          where: {
            OR: [
              { tiktokHandle: videoData.authorUsername },
              { name: videoData.authorUsername }
            ]
          }
        });

        if (!influencer) {
          // Create placeholder influencer
          influencer = await prisma.influencer.create({
            data: {
              name: videoData.authorUsername,
              tiktokHandle: videoData.authorUsername,
              status: 'SUGGESTION',
              tier: 'micro',
              primaryPlatform: 'TIKTOK',
              notes: `Auto-discovered via hashtag #${hashtag}`,
              createdById: 'cmlasiv0w0000dovsp7nnmgi0' // AI user ID
            }
          });
          console.log(`[ANALYZE HASHTAG] Created influencer: @${videoData.authorUsername}`);
        }

        // Create video with metrics
        await prisma.video.create({
          data: {
            url: videoData.videoUrl,
            platform: 'TIKTOK',
            campaignId: campaignId,
            influencerId: influencer.id,
            views: videoData.viewCount,
            likes: videoData.likeCount,
            comments: videoData.commentCount,
            shares: videoData.shareCount,
            description: videoData.description,
            publishedAt: videoData.publishedAt || new Date()
          }
        });

        newCount++;
        console.log(`[ANALYZE HASHTAG] Created video: ${videoData.videoUrl} by @${videoData.authorUsername}`);

      } catch (err: any) {
        console.error('[VIDEO CREATE ERROR]', err.message);
        // Continue processing others
      }
    }

    console.log(`[ANALYZE HASHTAG] Complete: ${newCount} new, ${skippedCount} skipped, ${brandExcludedCount} brand excluded`);

    return NextResponse.json({
      newVideos: newCount,
      skipped: skippedCount,
      excludedBrand: brandExcludedCount,
      total: filteredVideos.length,
      source: 'apify'
    });

  } catch (err: any) {
    console.error('[ANALYZE HASHTAG ERROR]', err.message);
    return NextResponse.json(
      { error: 'Failed to analyze hashtag', details: err.message },
      { status: 500 }
    );
  }
}
