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

interface ApifyAuthorItem {
  'authorMeta.name': string;
  'authorMeta.nickName'?: string;
  'authorMeta.fans'?: number;
  'authorMeta.verified'?: boolean;
  'authorMeta.signature'?: string;
  'authorMeta.video'?: number;
  'authorMeta.avatar'?: string;
  'authorMeta.bioLink'?: string;
  'authorMeta.id'?: string;
  'authorMeta.privateAccount'?: boolean;
}

interface ApifyPostItem {
  webVideoUrl: string;
  text?: string;
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  'videoMeta.duration'?: number;
  'videoMeta.coverUrl'?: string;
  createTimeISO?: string;
  hashtags?: any[];
  'authorMeta.name'?: string;
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
  
  // DEBUG: Show first item structure to understand format
  if (allItems && allItems.length > 0) {
    console.log('[APIFY] First item keys:', Object.keys(allItems[0]));
    console.log('[APIFY] First item sample:', JSON.stringify(allItems[0]).substring(0, 800));
    console.log('[APIFY] Has authorMeta.fans?', allItems[0]['authorMeta.fans']);
    console.log('[APIFY] Has webVideoUrl?', allItems[0].webVideoUrl);
  }
  
  // CRITICAL: Separate Authors vs Posts
  // Authors have 'authorMeta.fans', Posts have 'webVideoUrl'
  const authors = allItems.filter((item: any) => item['authorMeta.fans'] !== undefined);
  const posts = allItems.filter((item: any) => item.webVideoUrl !== undefined);
  
  console.log(`[APIFY] Separated: ${authors.length} author items, ${posts.length} post items`);
  
  // Validate we got author data
  if (authors.length === 0) {
    throw new Error(`No author data returned by Apify for @${cleanHandle}. Profile may be private or deleted.`);
  }
  
  // Get first author (they're all identical)
  const authorData = authors[0] as ApifyAuthorItem;
  
  console.log(`[APIFY] Author data extracted:`, JSON.stringify({
    handle: authorData['authorMeta.name'],
    nickname: authorData['authorMeta.nickName'],
    fans: authorData['authorMeta.fans'],
    videos: authorData['authorMeta.video'],
    verified: authorData['authorMeta.verified'],
  }));
  
  // Extract author fields (FLAT strings with dots!)
  const followers = authorData['authorMeta.fans'] || null;
  const verified = authorData['authorMeta.verified'] || false;
  const biography = authorData['authorMeta.signature'] || null;
  const videoCount = authorData['authorMeta.video'] || null;
  const avatar = authorData['authorMeta.avatar'] || null;
  const bioLink = authorData['authorMeta.bioLink'] || null;
  const displayName = authorData['authorMeta.nickName'] || authorData['authorMeta.name'];
  
  // Calculate metrics from posts
  let totalLikes = 0, totalViews = 0;
  posts.forEach((post: any) => {
    totalLikes += post.diggCount || 0;
    totalViews += post.playCount || 0;
  });
  
  const avgViews = posts.length > 0 ? totalViews / posts.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : null;

  console.log(`[APIFY] Profile complete:`, {
    handle: cleanHandle,
    followers,
    totalLikes,
    avgViews: Math.round(avgViews),
    engagementRate: engagementRate?.toFixed(2) + '%',
    verified,
    postsFound: posts.length,
  });

  return {
    handle: cleanHandle,
    name: displayName,
    platform: 'TIKTOK',
    followers: followers,
    totalLikes: totalLikes > 0 ? totalLikes : null,
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
      posts: posts.slice(0, 10), // Keep max 10 for Gemini
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
