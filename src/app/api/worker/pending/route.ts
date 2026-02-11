import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/worker/pending - Get influencers pending import
export async function GET() {
  try {
    const pending = await prisma.influencer.findMany({
      where: {
        status: 'IMPORT_PENDING',
        OR: [
          { tiktokHandle: { not: null } },
          { instagramHandle: { not: null } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 10, // Process max 10 at a time
      select: {
        id: true,
        name: true,
        tiktokHandle: true,
        instagramHandle: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info('Pending influencers fetched', { count: pending.length });
    return NextResponse.json(serializeBigInt(pending));
  } catch (error) {
    logger.error('GET /api/worker/pending failed', error);
    return handleApiError(error);
  }
}
