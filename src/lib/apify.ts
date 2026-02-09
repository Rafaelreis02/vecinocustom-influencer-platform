import { ApifyClient } from 'apify-client';

// Initialize Apify client
const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

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
  rawData: any; // Store full API response for debugging
}

export interface ScrapedVideo {
  videoUrl: string;
  authorUsername: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  publishedAt: Date | null;
  description: string | null;
  hashtags: string[];
}

// ============================================
// RETRY LOGIC
// ============================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`[APIFY RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
}

// ============================================
// TIKTOK PROFILE SCRAPER
// ============================================

async function scrapeTikTokProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  
  const run = await client.actor('GdWCkxBtKWOsKjdch').call({
    profiles: [`https://www.tiktok.com/@${cleanHandle}`],
    resultsPerPage: 100,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`TikTok profile not found: @${cleanHandle}`);
  }

  // Apify returns videos, not profile stats
  // Calculate metrics from the videos returned
  const videos = items as any[];
  
  let totalLikes = 0;
  let totalViews = 0;
  let totalComments = 0;
  
  videos.forEach((video) => {
    totalLikes += (video.diggCount || 0);
    totalViews += (video.playCount || 0);
    totalComments += (video.commentCount || 0);
  });
  
  const avgLikesPerVideo = videos.length > 0 ? totalLikes / videos.length : 0;
  const avgViewsPerVideo = videos.length > 0 ? totalViews / videos.length : 0;
  
  // Calculate engagement rate (likes per view)
  let engagementRate: number | null = null;
  if (totalViews > 0) {
    engagementRate = (totalLikes / totalViews) * 100;
  }
  
  // Fallback engagement rate if no videos
  const firstVideo = videos[0] as any;
  const profileData = firstVideo.author || {};
  
  // Estimate followers from avg views (fallback)
  // Assuming ~10% of followers view a video
  const estimatedFollowers = Math.round((avgViewsPerVideo / 0.1) || 5000);
  
  // Estimate price based on average views per video
  let estimatedPrice: number | null = null;
  if (avgViewsPerVideo > 0) {
    if (avgViewsPerVideo < 5000) {
      estimatedPrice = 50; // Nano
    } else if (avgViewsPerVideo < 50000) {
      estimatedPrice = 150; // Micro
    } else if (avgViewsPerVideo < 200000) {
      estimatedPrice = 300; // Mid
    } else if (avgViewsPerVideo < 500000) {
      estimatedPrice = 800; // Macro
    } else {
      estimatedPrice = 2000; // Mega
    }
  }

  return {
    handle: cleanHandle,
    platform: 'TIKTOK',
    followers: estimatedFollowers > 0 ? estimatedFollowers : null,
    totalLikes: totalLikes > 0 ? BigInt(totalLikes) : null,
    engagementRate: engagementRate,
    biography: (profileData.signature as string) || null,
    estimatedPrice: estimatedPrice || 150,
    averageViews: avgViewsPerVideo > 0 ? `${Math.round(avgViewsPerVideo)}` : null,
    verified: (profileData.verified as boolean) || false,
    rawData: { videos, totalLikes, totalViews, totalComments, avgEngagement: engagementRate },
  };
}

// ============================================
// INSTAGRAM PROFILE SCRAPER
// ============================================

async function scrapeInstagramProfile(handle: string): Promise<ParsedProfile> {
  const cleanHandle = handle.replace('@', '');
  
  const run = await client.actor('dSAXeB8J9K2mL5p1').call({
    usernames: [cleanHandle],
    resultsLimit: 1,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`Instagram profile not found: @${cleanHandle}`);
  }

  const profile = items[0] as any;
  
  // Calculate engagement rate (likes per post / followers)
  let engagementRate: number | null = null;
  const followersCount = (profile.followersCount as number) ?? 0;
  const likesCount = (profile.likesCount as number) ?? 0;
  const mediaCount = (profile.mediaCount as number) ?? 0;
  
  if (followersCount > 0 && likesCount > 0 && mediaCount > 0) {
    const avgLikesPerPost = likesCount / Math.max(mediaCount, 1);
    engagementRate = (avgLikesPerPost / followersCount) * 100;
  }

  // Estimate price based on followers
  let estimatedPrice: number | null = null;
  if (followersCount > 0) {
    if (followersCount < 10000) {
      estimatedPrice = 75;
    } else if (followersCount < 50000) {
      estimatedPrice = 200;
    } else if (followersCount < 100000) {
      estimatedPrice = 400;
    } else if (followersCount < 500000) {
      estimatedPrice = 1000;
    } else {
      estimatedPrice = 2500;
    }
  }

  return {
    handle: cleanHandle,
    platform: 'INSTAGRAM',
    followers: followersCount > 0 ? followersCount : null,
    totalLikes: likesCount > 0 ? BigInt(likesCount) : null,
    engagementRate: engagementRate,
    biography: (profile.biography as string) || null,
    estimatedPrice: estimatedPrice,
    averageViews: null, // Instagram doesn't always show views
    verified: (profile.verified as boolean) || false,
    rawData: profile,
  };
}

// ============================================
// TIKTOK HASHTAG VIDEOS SCRAPER
// ============================================

async function scrapeTikTokHashtagVideos(hashtag: string, maxVideos: number = 30): Promise<ScrapedVideo[]> {
  const cleanHashtag = hashtag.replace('#', '');
  
  const run = await client.actor('GdWCkxBtKWOsKjdch').call({
    hashtags: [cleanHashtag],
    resultsPerPage: maxVideos,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((video: any) => ({
    videoUrl: video.webVideoUrl || `https://www.tiktok.com/video/${video.id}`,
    authorUsername: video.authorMeta?.name || 'unknown',
    viewCount: video.playCount || null,
    likeCount: video.diggCount || null,
    commentCount: video.commentCount || null,
    shareCount: video.shareCount || null,
    publishedAt: video.createTime ? new Date(video.createTime * 1000) : null,
    description: video.text || null,
    hashtags: video.hashtags || [],
  }));
}

// ============================================
// PUBLIC API WITH RETRY
// ============================================

/**
 * Parse a TikTok or Instagram profile
 * @param handle - Username (with or without @)
 * @param platform - 'TIKTOK' or 'INSTAGRAM'
 * @returns Structured profile data
 */
export async function parseProfile(
  handle: string,
  platform: 'TIKTOK' | 'INSTAGRAM'
): Promise<ParsedProfile> {
  return retryWithBackoff(async () => {
    if (platform === 'TIKTOK') {
      return await scrapeTikTokProfile(handle);
    } else if (platform === 'INSTAGRAM') {
      return await scrapeInstagramProfile(handle);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  });
}

/**
 * Scrape videos from a TikTok hashtag
 * @param hashtag - Hashtag (with or without #)
 * @param maxVideos - Maximum number of videos to scrape (default: 30)
 * @returns Array of scraped videos
 */
export async function scrapeHashtagVideos(
  hashtag: string,
  maxVideos: number = 30
): Promise<ScrapedVideo[]> {
  return retryWithBackoff(async () => {
    return await scrapeTikTokHashtagVideos(hashtag, maxVideos);
  });
}
