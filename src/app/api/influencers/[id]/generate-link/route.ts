import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InfluencerStatus } from '@prisma/client';

// POST /api/influencers/[id]/generate-link - Generate/regenerate portalToken
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      select: { portalToken: true, status: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // If token already exists, return it (don't regenerate unless forced)
    if (influencer.portalToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const portalUrl = `${baseUrl}/portal/${influencer.portalToken}`;
      
      // If status is UNKNOWN, update it to COUNTER_PROPOSAL when generating link
      if (influencer.status === InfluencerStatus.UNKNOWN) {
        await prisma.influencer.update({
          where: { id },
          data: { status: InfluencerStatus.COUNTER_PROPOSAL },
        });
      }
      
      return NextResponse.json({
        success: true,
        portalToken: influencer.portalToken,
        portalUrl,
      });
    }

    // Generate new UUID token explicitly
    const crypto = require('crypto');
    const newToken = crypto.randomUUID();
    
    // Update data - set token and change status from UNKNOWN to COUNTER_PROPOSAL if needed
    const updateData: { portalToken: string; status?: InfluencerStatus } = { portalToken: newToken };
    if (influencer.status === InfluencerStatus.UNKNOWN) {
      updateData.status = InfluencerStatus.COUNTER_PROPOSAL;
    }
    
    const updated = await prisma.influencer.update({
      where: { id },
      data: updateData,
      select: { portalToken: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/portal/${updated.portalToken}`;

    return NextResponse.json({
      success: true,
      portalToken: updated.portalToken,
      portalUrl,
    });
  } catch (err: any) {
    console.error('[API ERROR] Generating portal link:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to generate portal link', details: err?.message },
      { status: 500 }
    );
  }
}
