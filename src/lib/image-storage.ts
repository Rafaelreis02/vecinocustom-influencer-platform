import { put } from '@vercel/blob';

/**
 * Download an image from URL and upload to Vercel Blob
 * Returns the permanent URL
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    
    console.log(`[IMAGE] Downloading: ${imageUrl}`);
    
    // Fetch image from source
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`[IMAGE] Failed to download: ${response.status}`);
      return null;
    }
    
    // Get image buffer
    const blob = await response.blob();
    console.log(`[IMAGE] Downloaded: ${blob.size} bytes`);
    
    // Upload to Vercel Blob
    const { url } = await put(fileName, blob, {
      access: 'public',
      contentType: blob.type || 'image/jpeg',
    });
    
    console.log(`[IMAGE] Stored: ${url}`);
    return url;
    
  } catch (error) {
    console.error('[IMAGE] Error:', error);
    return null;
  }
}