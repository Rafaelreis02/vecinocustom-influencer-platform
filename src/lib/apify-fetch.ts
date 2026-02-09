/**
 * Apify Integration - Pure Fetch
 * Uses direct HTTP calls instead of ApifyClient (which has header bugs on Vercel)
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();
const APIFY_API = 'https://api.apify.com/v2';

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

async function runActorAndWait(actorId: string, input: any): Promise<any[]> {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN not set');

  // Start run
  const runRes = await fetch(`${APIFY_API}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Failed to start actor: ${runRes.status} ${err}`);
  }

  const { data: run } = await runRes.json();
  console.log(`[APIFY] Run ${run.id} started, waiting...`);

  // Poll for completion (max 60s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const statusRes = await fetch(`${APIFY_API}/actor-runs/${run.id}?token=${APIFY_TOKEN}`);
    const { data: status } = await statusRes.json();

    if (status.status === 'SUCCEEDED') {
      console.log(`[APIFY] Run completed`);
      
      // Get dataset
      const dataRes = await fetch(`${APIFY_API}/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
      return await dataRes.json();
    } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
      throw new Error(`Actor run ${status.status}`);
    }
  }

  throw new Error('Actor run timeout (60s)');
}

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  
  // Get videos for engagement/views metrics AND author profile data
  const videos = await runActorAndWait('GdWCkxBtKWOsKjdch', {
    profiles: [`https://www.tiktok.com/@${cleanHandle}`],
    resultsPerPage: 100,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  if (!videos || videos.length === 0) {
    throw new Error(`TikTok profile not found: @${cleanHandle}`);
  }

  const author = videos[0]?.author || {};
  
  // Extract real followers from author data (from videos)
  const followers = author.followerCount || author.fans || null;
  
  if (!followers) {
    console.log(`[APIFY] WARNING: No follower count found in video author data for @${cleanHandle}`);
    console.log(`[APIFY] Author data keys:`, Object.keys(author));
    throw new Error(`Could not extract follower count for @${cleanHandle}`);
  }

  let totalLikes = 0, totalViews = 0;
  videos.forEach((v: any) => {
    totalLikes += v.diggCount || 0;
    totalViews += v.playCount || 0;
  });

  const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;

  let estimatedPrice = 150;
  if (avgViews < 5000) estimatedPrice = 50;
  else if (avgViews < 50000) estimatedPrice = 150;
  else if (avgViews < 200000) estimatedPrice = 300;
  else if (avgViews < 500000) estimatedPrice = 800;
  else estimatedPrice = 2000;

  console.log(`[APIFY] Profile extracted:`, {
    handle: cleanHandle,
    followers: followers,
    totalLikes: totalLikes,
    avgViews: Math.round(avgViews),
    engagementRate: engagementRate?.toFixed(2) + '%',
  });

  return {
    handle: cleanHandle,
    platform: 'TIKTOK',
    followers: followers,
    totalLikes: totalLikes > 0 ? BigInt(totalLikes) : null,
    engagementRate,
    biography: author.signature || null,
    estimatedPrice,
    averageViews: avgViews > 0 ? Math.round(avgViews).toString() : null,
    verified: author.verified || false,
    rawData: { videos, totalLikes, totalViews, author },
  };
}

export async function parseProfile(
  handle: string,
  platform: 'TIKTOK' | 'INSTAGRAM'
): Promise<ParsedProfile> {
  if (platform === 'TIKTOK') return scrapeTikTokProfile(handle);
  throw new Error(`Platform ${platform} not supported yet`);
}

export async function scrapeHashtagVideos(hashtag: string, maxVideos = 30): Promise<any[]> {
  const cleanTag = hashtag.replace('#', '');
  return runActorAndWait('GdWCkxBtKWOsKjdch', {
    hashtags: [cleanTag],
    resultsPerPage: maxVideos,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
}
