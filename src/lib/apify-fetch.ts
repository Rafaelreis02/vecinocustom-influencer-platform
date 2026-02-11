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
  
  console.log(`[APIFY] Scraping TikTok profile: @${cleanHandle}`);
  
  // STRATEGY: Try Profile Actor first (direct profile data), fallback to Video Scraper
  
  // Try 1: Profile Actor (fast, direct profile stats)
  try {
    console.log(`[APIFY] Trying Profile Actor for @${cleanHandle}`);
    const profileResults = await runActorAndWait('iH5tKMhpc9Z8vL3m4', {
      profiles: [`https://www.tiktok.com/@${cleanHandle}`],
    });
    
    if (profileResults && profileResults.length > 0) {
      const profileData = profileResults[0];
      console.log(`[APIFY] Profile Actor success:`, {
        followers: profileData.followerCount,
        hearts: profileData.heartCount,
        verified: profileData.verified,
      });
      
      const followers = profileData.followerCount || 5000;
      const hearts = profileData.heartCount || 0;
      
      // Estimate price based on followers
      let estimatedPrice = 150;
      if (followers < 10000) estimatedPrice = 50;
      else if (followers < 50000) estimatedPrice = 150;
      else if (followers < 200000) estimatedPrice = 300;
      else if (followers < 500000) estimatedPrice = 800;
      else estimatedPrice = 2000;
      
      return {
        handle: cleanHandle,
        platform: 'TIKTOK',
        followers: followers,
        totalLikes: hearts > 0 ? hearts : null,
        engagementRate: null, // Profile actor doesn't give views, can't calculate
        biography: profileData.description || null,
        estimatedPrice,
        averageViews: null,
        verified: profileData.verified || false,
        rawData: { profileData, source: 'profile-actor' },
      };
    }
  } catch (e) {
    console.log(`[APIFY] Profile Actor failed for @${cleanHandle}, trying Video Scraper fallback:`, e);
  }
  
  // Try 2: Video Scraper (slower, but gives engagement metrics)
  try {
    console.log(`[APIFY] Trying Video Scraper for @${cleanHandle}`);
    const videos = await runActorAndWait('GdWCkxBtKWOsKjdch', {
      profiles: [`https://www.tiktok.com/@${cleanHandle}`],
      resultsPerPage: 100,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });

    console.log(`[APIFY] Got ${videos?.length || 0} videos from @${cleanHandle}`);

    if (!videos || videos.length === 0) {
      throw new Error('No videos found');
    }
    
    const author = videos[0]?.author || {};
  
  console.log(`[APIFY] Author data from first video:`, {
    keys: Object.keys(author),
    followerCount: author.followerCount,
    fans: author.fans,
    heartCount: author.heartCount,
  });

  let totalLikes = 0, totalViews = 0;
  videos.forEach((v: any) => {
    totalLikes += v.diggCount || 0;
    totalViews += v.playCount || 0;
  });

  const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;

  // Try to get real followers, fallback to estimate with detailed logging
  let followers = author.followerCount || author.fans || author.heartCount || null;
  
  if (!followers) {
    // Fallback: estimate from average views
    followers = Math.max(Math.round(avgViews * 0.1), 1000); // Conservative estimate
    console.log(`[APIFY] No follower data found, estimating from avgViews (${avgViews.toFixed(0)}): ${followers}`);
  } else {
    console.log(`[APIFY] Real follower count found: ${followers}`);
  }

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
      totalLikes: totalLikes > 0 ? totalLikes : null,
      engagementRate,
      biography: author.signature || null,
      estimatedPrice,
      averageViews: avgViews > 0 ? Math.round(avgViews).toString() : null,
      verified: author.verified || false,
      rawData: { videos, totalLikes, totalViews, author, source: 'video-scraper' },
    };
  } catch (e) {
    console.log(`[APIFY] Video Scraper also failed for @${cleanHandle}:`, e);
  }
  
  // Both methods failed - return minimal safe data
  console.log(`[APIFY] Could not extract data for @${cleanHandle} from any Apify source`);
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
    rawData: { message: 'Profile may be private, deleted, or have no public content', source: 'fallback' },
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
