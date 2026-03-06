import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/portal/[token]/request-revision - Influencer requests revision
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { message } = body;

    // Get influencer by token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      include: { workflow: true },
    });

    if (!influencer || !influencer.workflow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const workflow = influencer.workflow;

    // Verify at step 4
    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Not at design review step' }, { status: 400 });
    }

    // Increment revision count
    const newRevisionCount = (workflow.designRevisionCount || 0) + 1;

    // Update workflow
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        designRevisionCount: newRevisionCount,
      },
    });

    // Add message from influencer
    await prisma.designMessage.create({
      data: {
        workflowId: workflow.id,
        content: message || 'Solicitação de alterações',
        senderType: 'INFLUENCER',
      },
    });

    logger.info('[PORTAL_DESIGN] Revision requested:', { workflowId: workflow.id, revisionCount: newRevisionCount });

    return NextResponse.json({ success: true, revisionCount: newRevisionCount });
  } catch (error: any) {
    logger.error('[PORTAL_DESIGN] Error requesting revision:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
