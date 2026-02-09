/**
 * Apify Integration - Direct HTTP Calls
 * 
 * Uses fetch instead of ApifyClient to avoid header encoding issues
 */

// Get token (trim to remove any whitespace)
const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();

if (!APIFY_TOKEN) {
  console.error('[APIFY] APIFY_TOKEN not configured');
}

const APIFY_API_BASE = 'https://api.apify.com/v2';

// ============================================
// TYPES
// ============================================

export interface ParsedProfile {
  handle: string;
  platform: 'TIKTOK' | 'INSTAGRAM';
  followers: number | null;
  totalLikes: bigint | null;
  engagementRate: number | null;
  biography: string | null;
  estimatedPrice: number | null;
  averageViews: string | null;
  verified: boolean;
  rawData: any;
}

// ============================================
// HELPER: Run Actor
// ============================================

async function runActor(actorId: string, input: any): Promise<any[]> {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN not configured');
  }

  console.log(`[APIFY] Running actor ${actorId}...`);

  // Start actor run
  const runRes = await fetch(`${APIFY_API_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!runRes.ok) {
    const errorText = await runRes.text();
    throw new Error(`Failed to start actor: ${runRes.status} ${errorText}`);
  }

  const runData = await runRes.json();
  const runId = runData.data.id;
  const datasetId = runData.data.defaultDatasetId;

  console.log(`[APIFY] Run started: ${runId}, waiting...`);

  // Poll until complete (max 60s)
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusRes = await fetch(`${APIFY_API_BASE}/acts/${actorId}/runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusRes.json();
    const status = statusData.data.status;

    if (status === 'SUCCEEDED') {
      console.log(`[APIFY] Run completed successfully`);
      break;
    } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run failed with status: ${status}`);
    }
  }

  // Get dataset items
  console.log(`[APIFY] Fetching dataset ${datasetId}...`);
  const datasetRes = await fetch(`${APIFY_API_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);

  if (!datasetRes.ok) {
    throw new Error(`Failed to fetch dataset: ${datasetRes.status}`);
  }

  const items = await datasetRes.json();
  return items || [];
}

// ============================================
// TIKTOK PROFILE SCRAPER
// ============================================

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  
  const items = await runActor('GdWCkxBtKWOsKjdch', {
    profiles: [`https://www.tiktok.com/@${cleanHandle}`],
    resultsPerPage: 100,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  if (!items || items.length === 0) {
    throw new Error(`TikTok profile not found: @${cleanHandle}`);
  }

  // Calculate metrics from videos
  const videos = items as any[];
  
  let totalLikes = 0;
  let totalViews = 0;
  
  videos.forEach((video) => {
    totalLikes += (video.diggCount || 0);
    totalViews += (video.playCount || 0);
  });
  
  const avgViewsPerVideo = videos.length > 0 ? totalViews / videos.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;
  const firstVideo = videos[0] as any;
  const profileData = firstVideo.author || {};
  const estimatedFollowers = Math.round((avgViewsPerVideo / 0.1) || 5000);
  
  // Estimate price
  let estimatedPrice = 150;
  if (avgViewsPerVideo > 0) {
    if (avgViewsPerVideo < 5000) estimatedPrice = 50;
    else if (avgViewsPerVideo < 50000) estimatedPrice = 150;
    else if (avgViewsPerVideo < 200000) estimatedPrice = 300;
    else if (avgViewsPerVideo < 500000) estimatedPrice = 800;
    else estimatedPrice = 2000;
  }

  return {
    handle: cleanHandle,
    platform: 'TIKTOK',
    followers: estimatedFollowers > 0 ? estimatedFollowers : null,
    totalLikes: totalLikes > 0 ? BigInt(totalLikes) : null,
    engagementRate,
    biography: (profileData.signature as string) || null,
    estimatedPrice,
    averageViews: avgViewsPerVideo > 0 ? `${Math.round(avgViewsPerVideo)}` : null,
    verified: (profileData.verified as boolean) || false,
    rawData: { videos, totalLikes, totalViews },
  };
}

// ============================================
// PUBLIC API
// ============================================

export async function parseProfile(
  handle: string,
  platform: 'TIKTOK' | 'INSTAGRAM'
): Promise<ParsedProfile> {
  if (platform === 'TIKTOK') {
    return await scrapeTikTokProfile(handle);
  }
  throw new Error(`Platform ${platform} not yet implemented with direct fetch`);
}
