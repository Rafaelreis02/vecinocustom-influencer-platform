import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/partnerships/[id]/request-revision - Influencer requests design revision
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { message, imageUrl } = body;

    // Get workflow
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: { influencer: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Can only request revision at step 4' }, { status: 400 });
    }

    // Increment revision count
    const newRevisionCount = (workflow.designRevisionCount || 0) + 1;

    // Update workflow
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        designRevisionCount: newRevisionCount,
        designApproved: false,
      },
    });

    // Add message from influencer
    await prisma.designMessage.create({
      data: {
        workflowId: id,
        content: message || 'Solicitação de alterações no design',
        imageUrl,
        senderType: 'INFLUENCER',
      },
    });

    logger.info('[DESIGN_REVISION] Revision requested:', { workflowId: id, revisionCount: newRevisionCount });

    return NextResponse.json({
      success: true,
      message: 'Revision requested successfully',
      data: updatedWorkflow,
    });
  } catch (error: any) {
    logger.error('[DESIGN_REVISION] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
