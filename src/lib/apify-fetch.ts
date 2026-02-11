/**
 * Apify TikTok Scraper Integration
 * 
 * CRITICAL: Apify returns MIXED item types for profiles:
 * - Posts (videos) - have webVideoUrl
 * - Authors (profile data) - have authorMeta.fans
 * 
 * Fields use FLAT strings with dots (e.g., 'authorMeta.fans'), not nested objects!
 * 
 * See APIFY_SPEC.md for full documentation.
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim();
const APIFY_API = 'https://api.apify.com/v2';
const ACTOR_ID = 'GdWCkxBtKWOsKjdch'; // TikTok Scraper

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
  rawData: {
    author: any;
    posts: any[];
  };
}

interface ApifyAuthorMeta {
  id: string;
  name: string;
  nickName?: string;
  fans?: number;
  verified?: boolean;
  signature?: string;
  video?: number;
  avatar?: string;
  heart?: number;
  following?: number;
  privateAccount?: boolean;
  profileUrl?: string;
}

interface ApifyPostItem {
  id: string;
  webVideoUrl: string;
  text?: string;
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  createTimeISO?: string;
  hashtags?: any[];
  authorMeta: ApifyAuthorMeta; // Nested object with author data
  videoMeta?: {
    duration?: number;
    coverUrl?: string;
    height?: number;
    width?: number;
  };
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

// ============================================
// PROFILE PARSER
// ============================================

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
  
  console.log(`[APIFY] Scraping TikTok profile: @${cleanHandle} (URL: ${profileUrl})`);
  
  // Query Apify for profile
  const allItems = await runActorAndWait(ACTOR_ID, {
    profiles: [profileUrl],
    resultsPerPage: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  console.log(`[APIFY] Received ${allItems?.length || 0} total items from Apify`);
  
  // Validate we got data
  if (!allItems || allItems.length === 0) {
    throw new Error(`No data returned by Apify for @${cleanHandle}. Profile may be private, deleted, or has no videos.`);
  }
  
  // CRITICAL FIX: authorMeta is NESTED inside each post, not flat!
  // Each post item has: { authorMeta: { fans, video, verified, ... }, webVideoUrl, ... }
  // So ALL items are posts, and they ALL have the same authorMeta nested
  
  const firstItem = allItems[0];
  
  console.log('[APIFY] First item authorMeta:', JSON.stringify(firstItem.authorMeta, null, 2));
  
  // Validate authorMeta exists
  if (!firstItem.authorMeta) {
    throw new Error(`No author metadata in Apify response for @${cleanHandle}`);
  }
  
  // Extract author data from nested authorMeta (all items have the same author)
  const authorData = firstItem.authorMeta;
  
  console.log(`[APIFY] Author data extracted:`, JSON.stringify({
    handle: authorData.name,
    nickname: authorData.nickName,
    fans: authorData.fans,
    videos: authorData.video,
    verified: authorData.verified,
    heart: authorData.heart,
  }));
  
  // Extract author fields from nested object
  const followers = authorData.fans || null;
  const verified = authorData.verified || false;
  const biography = authorData.signature || null;
  const videoCount = authorData.video || null;
  const avatar = authorData.avatar || null;
  const bioLink = null; // Not in this structure
  const displayName = authorData.nickName || authorData.name;
  const totalLikes = authorData.heart || null;
  
  // Calculate metrics from posts (all items are posts)
  let totalViews = 0;
  allItems.forEach((post: any) => {
    totalViews += post.playCount || 0;
  });
  
  const avgViews = allItems.length > 0 ? totalViews / allItems.length : 0;
  const engagementRate = totalViews > 0 && totalLikes ? (totalLikes / totalViews) * 100 : null;

  console.log(`[APIFY] Profile complete:`, {
    handle: cleanHandle,
    followers,
    totalLikes,
    avgViews: Math.round(avgViews),
    engagementRate: engagementRate?.toFixed(2) + '%',
    verified,
    postsFound: allItems.length,
  });

  return {
    handle: cleanHandle,
    name: displayName,
    platform: 'TIKTOK',
    followers: followers,
    totalLikes: totalLikes,
    engagementRate,
    biography: biography,
    estimatedPrice: null, // NO estimation - we don't have reliable data
    averageViews: avgViews > 0 ? Math.round(avgViews).toString() : null,
    verified: verified,
    videoCount: videoCount,
    avatar: avatar,
    bioLink: bioLink,
    rawData: {
      author: authorData,
      posts: allItems.slice(0, 10), // Keep max 10 for Gemini
    },
  };
}

// ============================================
// HASHTAG SCRAPER (for future use)
// ============================================

export async function scrapeHashtagVideos(hashtag: string, maxVideos = 30): Promise<any[]> {
  const cleanTag = hashtag.replace('#', '');
  console.log(`[APIFY] Scraping hashtag: #${cleanTag}`);
  
  return runActorAndWait(ACTOR_ID, {
    hashtags: [cleanTag],
    resultsPerPage: maxVideos,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Parse a TikTok profile
 * @param handle - Username (with or without @)
 * @param platform - 'TIKTOK' or 'INSTAGRAM'
 * @returns Structured profile data with NO estimations
 */
export async function parseProfile(
  handle: string,
  platform: 'TIKTOK' | 'INSTAGRAM'
): Promise<ParsedProfile> {
  if (platform === 'TIKTOK') {
    return scrapeTikTokProfile(handle);
  }
  
  throw new Error(`Platform ${platform} not implemented yet`);
}
