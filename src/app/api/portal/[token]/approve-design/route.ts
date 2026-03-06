import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/portal/[token]/approve-design - Influencer approves design
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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

    // Verify at step 4
    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Not at design review step' }, { status: 400 });
    }

    // Update workflow - advance to step 5
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        designApproved: true,
        currentStep: 5,
        step4CompletedAt: new Date(),
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: 'CONTRACT_PENDING' },
    });

    logger.info('[PORTAL_DESIGN] Design approved by influencer:', { workflowId: workflow.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[PORTAL_DESIGN] Error approving design:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
