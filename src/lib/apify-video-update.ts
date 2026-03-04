import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN?.trim(),
});

export interface VideoMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  description: string | null;
  authorUsername: string | null;
}

/**
 * Scrape/update metrics for a single video by URL
 * Works for both TikTok and Instagram
 */
export async function scrapeVideoMetrics(videoUrl: string): Promise<VideoMetrics | null> {
  if (!videoUrl) return null;
  
  try {
    // Detect platform from URL
    const isTikTok = videoUrl.includes('tiktok.com');
    const isInstagram = videoUrl.includes('instagram.com');
    
    if (isTikTok) {
      return await scrapeTikTokVideo(videoUrl);
    } else if (isInstagram) {
      return await scrapeInstagramVideo(videoUrl);
    }
    
    return null;
  } catch (error) {
    console.error('[APIFY] Error scraping video:', videoUrl, error);
    return null;
  }
}

async function scrapeTikTokVideo(videoUrl: string): Promise<VideoMetrics | null> {
  // Extract video ID
  const match = videoUrl.match(/\/video\/(\d+)/);
  if (!match) return null;
  
  const videoId = match[1];
  
  const run = await client.actor('GdWCkxBtKWOsKjdch').call({
    postURLs: [videoUrl],
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    return null;
  }

  const video = items[0] as any;
  
  return {
    views: video.playCount || video.stats?.playCount || null,
    likes: video.diggCount || video.stats?.diggCount || null,
    comments: video.commentCount || video.stats?.commentCount || null,
    shares: video.shareCount || video.stats?.shareCount || null,
    description: video.text || video.description || null,
    authorUsername: video.authorMeta?.name || video.author?.username || null,
  };
}

async function scrapeInstagramVideo(videoUrl: string): Promise<VideoMetrics | null> {
  const run = await client.actor('apify/instagram-scraper').call({
    directUrls: [videoUrl],
    resultsType: 'details',
    resultsLimit: 1,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  if (!items || items.length === 0) {
    return null;
  }

  const post = items[0] as any;
  
  return {
    views: post.videoViewCount || post.viewCount || post.views || null,
    likes: post.likesCount || post.likeCount || post.likes || null,
    comments: post.commentsCount || post.commentCount || post.comments || null,
    shares: null, // Instagram doesn't provide shares publicly
    description: post.caption || post.description || null,
    authorUsername: post.ownerUsername || post.username || null,
  };
}

/**
 * Batch update videos with rate limiting
 * Process max 15 videos per run to avoid rate limits
 */
export async function batchUpdateVideoMetrics(videoUrls: string[]): Promise<Map<string, VideoMetrics>> {
  const results = new Map<string, VideoMetrics>();
  
  // Process in batches of 5 with delay between batches
  const batchSize = 5;
  const delayBetweenBatches = 2000; // 2 seconds
  
  for (let i = 0; i < videoUrls.length; i += batchSize) {
    const batch = videoUrls.slice(i, i + batchSize);
    
    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const metrics = await scrapeVideoMetrics(url);
        return { url, metrics };
      })
    );
    
    // Store results
    batchResults.forEach(({ url, metrics }) => {
      if (metrics) {
        results.set(url, metrics);
      }
    });
    
    // Delay before next batch (unless it's the last one)
    if (i + batchSize < videoUrls.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}
