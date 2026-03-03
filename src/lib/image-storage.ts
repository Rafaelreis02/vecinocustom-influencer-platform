import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Storage de imagens usando Base64 na base de dados
 * Na Vercel não é possível guardar ficheiros localmente (read-only filesystem)
 * Solução alternativa: Guardar como base64 na DB (similar aos documentos)
 */

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max

/**
 * Download an image from URL and store as base64 in database
 * Returns a data URL that can be used directly in img src
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    
    logger.info(`[IMAGE] Downloading: ${imageUrl}`);
    
    // Fetch image from source
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      logger.error(`[IMAGE] Failed to download: ${response.status}`);
      return null;
    }
    
    // Get image data
    const arrayBuffer = await response.arrayBuffer();
    
    // Check size
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      logger.warn(`[IMAGE] Image too large: ${arrayBuffer.byteLength} bytes`);
      return null;
    }
    
    // Convert to base64
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Create data URL
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    logger.info(`[IMAGE] Stored as base64: ${dataUrl.length} chars`);
    return dataUrl;
    
  } catch (error) {
    logger.error('[IMAGE] Error downloading image:', error);
    return null;
  }
}

/**
 * Store image from buffer (used when we already have the image data)
 */
export function storeImageFromBuffer(
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): string {
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

/**
 * Get image size in bytes from base64 string
 */
export function getBase64ImageSize(base64String: string): number {
  // Remove data URL prefix if present
  const base64 = base64String.replace(/^data:image\/\w+;base64,/, '');
  // Calculate size (base64 is ~33% larger than binary)
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Check if string is a base64 data URL
 */
export function isBase64Image(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Extract base64 data from data URL
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}
