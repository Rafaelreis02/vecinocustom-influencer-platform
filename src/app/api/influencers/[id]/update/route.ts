import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { InfluencerUpdateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// PUT /api/influencers/[id]/update - Full update
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const validated = InfluencerUpdateSchema.parse(body);

    const updated = await prisma.influencer.update({
      where: { id },
      data: validated,
    });

    logger.info('Influencer updated via PUT', { id });
    return NextResponse.json(serializeBigInt(updated));
  } catch (error) {
    logger.error('PUT /api/influencers/[id]/update failed', error);
    return handleApiError(error);
  }
}
