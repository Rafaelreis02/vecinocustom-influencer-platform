import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/partnerships/[id]/approve-design - Influencer approves the design
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get workflow
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: { influencer: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Can only approve at step 4' }, { status: 400 });
    }

    // Update workflow - mark design as approved and advance to step 5
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        designApproved: true,
        currentStep: 5,
        step4CompletedAt: new Date(),
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'CONTRACT_PENDING' },
    });

    logger.info('[DESIGN_APPROVAL] Design approved:', { workflowId: id });

    return NextResponse.json({
      success: true,
      message: 'Design approved successfully',
      data: updatedWorkflow,
    });
  } catch (error: any) {
    logger.error('[DESIGN_APPROVAL] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
