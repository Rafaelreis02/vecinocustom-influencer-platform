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
  totalLikes: number | null;
  engagementRate: number | null;
  biography: string | null;
  estimatedPrice: number | null;
  averageViews: string | null;
  verified: boolean;
  rawData: any;
}

async function runActorAndWait(actorId: string, input: any): Promise<any[]> {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN not set in environment variables');
  }
  
  console.log(`[APIFY] Starting actor ${actorId} with token ${APIFY_TOKEN.substring(0, 10)}...`);

  // Start run
  const runRes = await fetch(`${APIFY_API}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Failed to start actor: ${runRes.status} ${err.substring(0, 200)}`);
  }

  const runText = await runRes.text();
  let run;
  try {
    const parsed = JSON.parse(runText);
    run = parsed.data;
  } catch (e) {
    throw new Error(`Apify returned invalid JSON: ${runText.substring(0, 200)}`);
  }
  
  if (!run?.id) {
    throw new Error(`Apify run missing ID: ${runText.substring(0, 200)}`);
  }
  
  console.log(`[APIFY] Run ${run.id} started, waiting...`);

  // Poll for completion (max 60s)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const statusRes = await fetch(`${APIFY_API}/actor-runs/${run.id}?token=${APIFY_TOKEN}`);
    
    if (!statusRes.ok) {
      const errText = await statusRes.text();
      throw new Error(`Failed to get run status: ${statusRes.status} ${errText.substring(0, 200)}`);
    }
    
    const statusText = await statusRes.text();
    let status;
    try {
      const parsed = JSON.parse(statusText);
      status = parsed.data;
    } catch (e) {
      throw new Error(`Apify status returned invalid JSON: ${statusText.substring(0, 200)}`);
    }

    if (status.status === 'SUCCEEDED') {
      console.log(`[APIFY] Run completed`);
      
      // Get dataset
      const dataRes = await fetch(`${APIFY_API}/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
      
      if (!dataRes.ok) {
        const errText = await dataRes.text();
        throw new Error(`Failed to get dataset: ${dataRes.status} ${errText.substring(0, 200)}`);
      }
      
      const dataText = await dataRes.text();
      try {
        return JSON.parse(dataText);
      } catch (e) {
        throw new Error(`Dataset returned invalid JSON: ${dataText.substring(0, 200)}`);
      }
    } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
      throw new Error(`Actor run ${status.status}`);
    }
  }

  throw new Error('Actor run timeout (60s)');
}

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
  
  console.log(`[APIFY] Scraping TikTok profile: @${cleanHandle} (URL: ${profileUrl})`);
  
  // Use GdWCkxBtKWOsKjdch actor - it handles profiles, hashtags, and videos
  const videos = await runActorAndWait('GdWCkxBtKWOsKjdch', {
    profiles: [profileUrl],
    resultsPerPage: 10, // Only fetch last 10 videos for Sonnet analysis
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  console.log(`[APIFY] Got ${videos?.length || 0} videos from @${cleanHandle}`);
  
  // Log first video author data for debugging
  if (videos && videos.length > 0) {
    const author = videos[0]?.author || {};
    console.log(`[APIFY] First video author data:`, JSON.stringify({
      id: author.id,
      uniqueId: author.uniqueId,
      nickname: author.nickname,
      followerCount: author.followerCount,
      fans: author.fans,
      heartCount: author.heartCount,
      videoCount: author.videoCount,
      verified: author.verified,
    }));
  }

  if (!videos || videos.length === 0) {
    console.log(`[APIFY] No videos found for @${cleanHandle} - profile may be private or empty`);
    return {
      handle: cleanHandle,
      platform: 'TIKTOK',
      followers: 5000,
      totalLikes: null,
      engagementRate: null,
      biography: null,
      estimatedPrice: 150,
      averageViews: null,
      verified: false,
      rawData: { message: 'No public videos found', source: 'apify' },
    };
  }

  const author = videos[0]?.author || {};
  
  console.log(`[APIFY] Author data:`, {
    followerCount: author.followerCount,
    fans: author.fans,
    heartCount: author.heartCount,
  });

  // Calculate metrics from videos
  let totalLikes = 0, totalViews = 0;
  videos.forEach((v: any) => {
    totalLikes += v.diggCount || 0;
    totalViews += v.playCount || 0;
  });

  const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;

  // Get followers (try multiple fields)
  let followers = author.followerCount || author.fans || null;
  
  if (!followers) {
    // Fallback: estimate from average views
    followers = Math.max(Math.round(avgViews * 0.1), 1000);
    console.log(`[APIFY] Estimating followers from avgViews: ${followers}`);
  } else {
    console.log(`[APIFY] Real follower count: ${followers}`);
  }

  // Estimate price based on average views
  let estimatedPrice = 150;
  if (avgViews < 5000) estimatedPrice = 50;
  else if (avgViews < 50000) estimatedPrice = 150;
  else if (avgViews < 200000) estimatedPrice = 300;
  else if (avgViews < 500000) estimatedPrice = 800;
  else estimatedPrice = 2000;

  console.log(`[APIFY] Profile complete:`, {
    handle: cleanHandle,
    followers,
    totalLikes,
    avgViews: Math.round(avgViews),
    engagementRate: engagementRate?.toFixed(2) + '%',
  });

  return {
    handle: cleanHandle,
    platform: 'TIKTOK',
    followers: followers,
    totalLikes: totalLikes > 0 ? totalLikes : null,
    engagementRate,
    biography: author.signature || null,
    estimatedPrice,
    averageViews: avgViews > 0 ? Math.round(avgViews).toString() : null,
    verified: author.verified || false,
    rawData: { videos, totalLikes, totalViews, author, source: 'apify' },
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
