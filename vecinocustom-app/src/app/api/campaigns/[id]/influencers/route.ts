import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/campaigns/[id]/influencers - Add influencer to campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();

    const campaignInfluencer = await prisma.campaignInfluencer.create({
      data: {
        campaignId,
        influencerId: body.influencerId,
        agreedFee: body.agreedFee ? parseFloat(body.agreedFee) : null,
        commissionRate: body.commissionRate ? parseFloat(body.commissionRate) : null,
        deliverables: body.deliverables || null,
        status: body.status || 'pending',
      },
    });

    return NextResponse.json(campaignInfluencer, { status: 201 });
  } catch (err: any) {
    console.error('[API ERROR] Adding influencer to campaign:', err);
    return NextResponse.json(
      { error: 'Failed to add influencer to campaign', details: err?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/influencers - Remove influencer from campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');

    if (!influencerId) {
      return NextResponse.json(
        { error: 'influencerId is required' },
        { status: 400 }
      );
    }

    await prisma.campaignInfluencer.deleteMany({
      where: {
        campaignId,
        influencerId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API ERROR] Removing influencer from campaign:', err);
    return NextResponse.json(
      { error: 'Failed to remove influencer from campaign', details: err?.message },
      { status: 500 }
    );
  }
}
