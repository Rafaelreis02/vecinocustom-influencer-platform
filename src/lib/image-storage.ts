import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

// Ensure avatars directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

/**
 * Download an image from URL and save to local public folder
 * Returns the public URL path
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
    
    // Get image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logger.info(`[IMAGE] Downloaded: ${buffer.length} bytes`);
    
    // Ensure filename has extension
    let finalFileName = fileName;
    if (!finalFileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // Try to determine extension from content-type
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('png')) {
        finalFileName += '.png';
      } else if (contentType?.includes('gif')) {
        finalFileName += '.gif';
      } else if (contentType?.includes('webp')) {
        finalFileName += '.webp';
      } else {
        finalFileName += '.jpg';
      }
    }
    
    // Save to local file system
    const filePath = path.join(AVATARS_DIR, finalFileName);
    fs.writeFileSync(filePath, buffer);
    
    // Return public URL (relative to public folder)
    const publicUrl = `/avatars/${finalFileName}`;
    
    logger.info(`[IMAGE] Stored locally: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    logger.error('[IMAGE] Error downloading/storing image:', error);
    return null;
  }
}

/**
 * Delete an avatar image from local storage
 */
export function deleteStoredImage(fileName: string): boolean {
  try {
    const filePath = path.join(AVATARS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[IMAGE] Deleted: ${fileName}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('[IMAGE] Error deleting image:', error);
    return false;
  }
}

/**
 * List all stored avatars
 */
export function listStoredAvatars(): string[] {
  try {
    if (!fs.existsSync(AVATARS_DIR)) {
      return [];
    }
    return fs.readdirSync(AVATARS_DIR);
  } catch (error) {
    logger.error('[IMAGE] Error listing avatars:', error);
    return [];
  }
}
