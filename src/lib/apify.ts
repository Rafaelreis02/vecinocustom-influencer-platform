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
  totalLikes: number | null;
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
    totalLikes: totalLikes > 0 ? totalLikes : null,
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
  
  // Usar o actor oficial apify/instagram-scraper
  const run = await client.actor('apify/instagram-scraper').call({
    usernames: [cleanHandle],
    resultsLimit: 1,
    resultsType: "details", // Garantir detalhes do perfil
    searchLimit: 1,
  });

  // Obter resultados do dataset
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    throw new Error(`Instagram profile not found: @${cleanHandle}`);
  }

  // O primeiro item deve ser o perfil (ou um post, depende do output mode, mas com usernames costuma ser perfil)
  // O apify/instagram-scraper retorna objetos de perfil com estrutura específica
  const profile = items[0] as any;
  
  // Validar se é o perfil correto (as vezes retorna busca)
  if (profile.username && profile.username.toLowerCase() !== cleanHandle.toLowerCase()) {
    // Tentar encontrar o match exato se vierem vários
    const exactMatch = items.find((i: any) => i.username?.toLowerCase() === cleanHandle.toLowerCase());
    if (exactMatch) {
      Object.assign(profile, exactMatch);
    }
  }

  // Extrair métricas
  const followersCount = (profile.followersCount as number) ?? 0;
  const followsCount = (profile.followsCount as number) ?? 0;
  const mediaCount = (profile.postsCount as number) ?? 0;
  
  // Calcular engagement baseado nos últimos posts (se disponíveis)
  let engagementRate: number | null = null;
  let avgLikes = 0;
  let avgComments = 0;

  if (profile.latestPosts && Array.isArray(profile.latestPosts) && profile.latestPosts.length > 0) {
    const posts = profile.latestPosts;
    const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.likesCount || 0), 0);
    const totalComments = posts.reduce((sum: number, p: any) => sum + (p.commentsCount || 0), 0);
    
    avgLikes = totalLikes / posts.length;
    avgComments = totalComments / posts.length;
    
    if (followersCount > 0) {
      engagementRate = ((avgLikes + avgComments) / followersCount) * 100;
    }
  } else {
    // Fallback genérico se não houver posts detalhados
    engagementRate = 1.5; // Estimativa conservadora
  }

  // Tentar extrair email da bio
  const bio = (profile.biography as string) || '';
  const emailMatch = bio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  const email = emailMatch ? emailMatch[0] : null;

  // Estimar preço (Lógica Vecino: micro-influencers)
  // PT: ~43€ media
  // ES/IT: ~68€ media
  let estimatedPrice: number | null = null;
  if (followersCount > 0) {
    if (followersCount < 10000) estimatedPrice = 30; // Nano
    else if (followersCount < 50000) estimatedPrice = 60; // Micro (Sweet spot)
    else if (followersCount < 100000) estimatedPrice = 100; // Mid
    else if (followersCount < 500000) estimatedPrice = 300; // Macro
    else estimatedPrice = 800; // Mega
  }

  return {
    handle: cleanHandle,
    platform: 'INSTAGRAM',
    followers: followersCount > 0 ? followersCount : null,
    totalLikes: null, // Instagram não tem "total likes" público facilmente
    engagementRate: engagementRate ? parseFloat(engagementRate.toFixed(2)) : null,
    biography: bio,
    estimatedPrice: estimatedPrice,
    averageViews: null,
    verified: (profile.verified as boolean) || false,
    rawData: { ...profile, emailExtracted: email }, // Guardar email extraído nos dados brutos
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
