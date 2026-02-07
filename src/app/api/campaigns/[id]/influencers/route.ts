import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/campaigns/[id]/influencers - Add influencer to campaign
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params;
    const body = await request.json();

    if (!body.influencerId) {
      return NextResponse.json(
        { error: 'influencerId is required' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await prisma.campaignInfluencer.findUnique({
      where: {
        campaignId_influencerId: {
          campaignId,
          influencerId: body.influencerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Influencer already in campaign' },
        { status: 400 }
      );
    }

    const campaignInfluencer = await prisma.campaignInfluencer.create({
      data: {
        campaignId,
        influencerId: body.influencerId,
        agreedFee: body.agreedFee ? parseFloat(body.agreedFee) : null,
        commissionRate: body.commissionRate ? parseFloat(body.commissionRate) : null,
        status: body.status || 'pending',
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            instagramHandle: true,
            tiktokHandle: true,
          },
        },
      },
    });

    return NextResponse.json(campaignInfluencer, { status: 201 });
  } catch (err: any) {
    console.error('[API ERROR] Adding influencer to campaign:', err);
    return NextResponse.json(
      { error: 'Failed to add influencer', details: err?.message },
      { status: 500 }
    );
  }
}
