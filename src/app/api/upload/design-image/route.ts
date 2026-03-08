import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Simple image upload endpoint - stores base64 in database
// For production, use Supabase Storage, Cloudinary, or S3

// Max size: 2MB (base64 increases size by ~33%)
const MAX_SIZE_MB = 2;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check if it's a data URL
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Extract base64 data
    const base64Data = image.split(',')[1];
    if (!base64Data) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    // Check size (base64 is ~33% larger than binary)
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `Image too large. Maximum size: ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // For now, return the base64 as the URL
    // In production, upload to Supabase Storage, Cloudinary, or S3
    // and return the public URL

    logger.info('[UPLOAD] Image uploaded successfully', { size: sizeInMB.toFixed(2) + 'MB' });

    return NextResponse.json({
      success: true,
      url: image, // Return base64 as URL for now
      size: sizeInMB.toFixed(2) + 'MB',
    });
  } catch (error: any) {
    logger.error('[UPLOAD] Error uploading image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
