import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  } catch (err: any) {
    console.error('[API ERROR] Removing influencer from campaign:', err);
    return NextResponse.json(
      { error: 'Failed to remove influencer', details: err?.message },
      { status: 500 }
    );
  }
}
