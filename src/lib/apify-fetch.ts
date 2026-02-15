/**
 * Apify Scraper Integration (TikTok + Instagram)
 * 
 * TikTok: GdWCkxBtKWOsKjdch
 * Instagram: apify/instagram-scraper
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();
const APIFY_API = 'https://api.apify.com/v2';
const TIKTOK_ACTOR = 'GdWCkxBtKWOsKjdch';
const INSTAGRAM_ACTOR = 'shu8hvrXbJbY3Eb9W'; // apify/instagram-scraper

// ============================================
// TYPES
// ============================================

export interface ParsedProfile {
  handle: string;
  name: string;
  platform: 'TIKTOK' | 'INSTAGRAM';
  followers: number | null;
  totalLikes: number | null;
  engagementRate: number | null;
  biography: string | null;
  estimatedPrice: number | null;
  averageViews: string | null;
  verified: boolean;
  videoCount: number | null;
  avatar: string | null;
  bioLink: string | null;
  email: string | null; // Added email
  rawData: any;
}

// ============================================
// ACTOR RUNNER
// ============================================

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

  const runData = await runRes.json();
  const runId = runData.data.id;
  const datasetId = runData.data.defaultDatasetId;
  
  console.log(`[APIFY] Run ${runId} started, waiting...`);

  // Poll for completion (max 90s)
  for (let i = 0; i < 45; i++) { // 45 * 2s = 90s
    await new Promise(r => setTimeout(r, 2000));

    const statusRes = await fetch(`${APIFY_API}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    if (!statusRes.ok) continue;
    
    const statusData = await statusRes.json();
    const status = statusData.data.status;

    if (status === 'SUCCEEDED') {
      console.log(`[APIFY] Run completed`);
      
      // Get dataset
      const dataRes = await fetch(`${APIFY_API}/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
      if (!dataRes.ok) {
        throw new Error(`Failed to get dataset`);
      }
      return await dataRes.json();
      
    } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Actor run ${status}`);
    }
  }

  throw new Error('Actor run timeout (90s)');
}

// ============================================
// TIKTOK PARSER
// ============================================

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
  
  console.log(`[APIFY] Scraping TikTok profile: @${cleanHandle}`);
  
  const allItems = await runActorAndWait(TIKTOK_ACTOR, {
    profiles: [profileUrl],
    resultsPerPage: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  if (!allItems || allItems.length === 0) {
    throw new Error(`No data returned by Apify for @${cleanHandle}`);
  }
  
  const firstItem = allItems[0];
  const authorData = firstItem.authorMeta; // Nested structure
  
  if (!authorData) {
    throw new Error(`No author metadata for @${cleanHandle}`);
  }
  
  // Calculate avg views from last 10 posts
  let totalViews = 0;
  allItems.forEach((post: any) => totalViews += (post.playCount || 0));
  const avgViews = allItems.length > 0 ? totalViews / allItems.length : 0;

  return {
    handle: cleanHandle,
    name: authorData.nickName || authorData.name,
    platform: 'TIKTOK',
    followers: authorData.fans || null,
    totalLikes: authorData.heart || null,
    engagementRate: null, // Hard to calc without total views history
    biography: authorData.signature || null,
    estimatedPrice: null,
    averageViews: Math.round(avgViews).toString(),
    verified: authorData.verified || false,
    videoCount: authorData.video || null,
    avatar: authorData.avatar || null,
    bioLink: null,
    email: null,
    rawData: { author: authorData, posts: allItems.slice(0, 5) },
  };
}

// ============================================
// INSTAGRAM PARSER
// ============================================

async function scrapeInstagramProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  const profileUrl = `https://www.instagram.com/${cleanHandle}/`;
  
  console.log(`[APIFY] Scraping Instagram profile: ${profileUrl}`);
  
  // Input for apify/instagram-scraper (confirmed working with directUrls)
  const items = await runActorAndWait(INSTAGRAM_ACTOR, {
    directUrls: [profileUrl],
    resultsLimit: 1,
    resultsType: "details",
    searchLimit: 1,
  });

  if (!items || items.length === 0) {
    throw new Error(`Instagram profile not found or private: @${cleanHandle}`);
  }

  // Find exact match if multiple returned
  let profile = items.find((i: any) => i.username?.toLowerCase() === cleanHandle.toLowerCase());
  if (!profile) profile = items[0]; // Fallback to first

  // Extract metrics
  const followers = profile.followersCount || 0;
  const posts = profile.latestPosts || [];
  
  // Calculate engagement from latest posts
  let engagementRate = 0;
  if (posts.length > 0 && followers > 0) {
    let totalInteractions = 0;
    posts.forEach((p: any) => {
      totalInteractions += (p.likesCount || 0) + (p.commentsCount || 0);
    });
    const avgInteractions = totalInteractions / posts.length;
    engagementRate = (avgInteractions / followers) * 100;
  }

  // Extract email from bio
  const bio = profile.biography || '';
  const emailMatch = bio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  const email = emailMatch ? emailMatch[0] : null;

  return {
    handle: cleanHandle,
    name: profile.fullName || cleanHandle,
    platform: 'INSTAGRAM',
    followers: followers,
    totalLikes: null, // Not available
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    biography: bio,
    estimatedPrice: null, // Calculator logic elsewhere
    averageViews: null,
    verified: profile.verified || false,
    videoCount: profile.postsCount || null,
    avatar: profile.profilePicUrl || null,
    bioLink: profile.externalUrl || null,
    email: email,
    rawData: profile,
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
    return scrapeTikTokProfile(handle);
  } else if (platform === 'INSTAGRAM') {
    return scrapeInstagramProfile(handle);
  }
  
  throw new Error(`Platform ${platform} not supported`);
}
