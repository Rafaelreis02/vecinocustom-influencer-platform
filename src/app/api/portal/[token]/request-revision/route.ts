import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { InfluencerStatus } from '@prisma/client';

// POST /api/portal/[token]/request-revision - Influencer requests revision
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { message, imageUrl } = body;

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

    // Increment revision count
    const newRevisionCount = (workflow.designRevisionCount || 0) + 1;

    // Update workflow and influencer status
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        designRevisionCount: newRevisionCount,
      },
    });

    // Update influencer status to ALTERATIONS_REQUESTED
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: {
        status: InfluencerStatus.ALTERATIONS_REQUESTED,
      },
    });

    // Add message from influencer using raw query
    const messageId = crypto.randomUUID();
    const finalImageUrl = imageUrl || null;
    await prisma.$executeRaw`
      INSERT INTO "DesignMessage" ("id", "workflowId", "content", "imageUrl", "senderType", "createdAt", "updatedAt")
      VALUES (${messageId}, ${workflow.id}, ${message || 'Solicitação de alterações'}, ${finalImageUrl}, 'INFLUENCER', NOW(), NOW())
    `;

    logger.info('[PORTAL_DESIGN] Revision requested:', { workflowId: workflow.id, revisionCount: newRevisionCount });

    return NextResponse.json({ success: true, revisionCount: newRevisionCount });
  } catch (error: any) {
    logger.error('[PORTAL_DESIGN] Error requesting revision:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
