import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// DELETE /api/campaigns/[id]/influencers/[linkId] - Remove influencer from campaign
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const { linkId } = await context.params;

    await prisma.campaignInfluencer.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/campaigns/[id]/influencers/[linkId] failed', error);
    return handleApiError(error);
  }
}
