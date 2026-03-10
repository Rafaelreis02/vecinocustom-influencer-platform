import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { InfluencerStatus } from '@prisma/client';

// POST /api/portal/[token]/submit-design-reference - Influencer submits design reference image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Get influencer by token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Get active workflow for this influencer
    const workflow = await prisma.partnershipWorkflow.findFirst({
      where: { 
        influencerId: influencer.id,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'No active workflow found' }, { status: 404 });
    }

    // Update workflow with design reference AND advance to step 4 (Design Review)
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        designReferenceUrl: imageUrl,
        designReferenceSubmittedAt: new Date(),
        currentStep: 4, // Advance to Design Review step
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: {
        status: InfluencerStatus.DESIGN_REFERENCE_SUBMITTED,
      },
    });

    logger.info('[PORTAL] Design reference submitted:', { workflowId: workflow.id, influencerId: influencer.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[PORTAL] Error submitting design reference:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
