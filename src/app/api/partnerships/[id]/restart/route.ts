import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/partnerships/[id]/restart - Restart a completed partnership
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the workflow
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Only allow restart if status is COMPLETED or CANCELLED
    if (workflow.status !== 'COMPLETED' && workflow.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Can only restart completed or cancelled partnerships' },
        { status: 400 }
      );
    }

    // Mark current workflow as COMPLETED (archived for history)
    await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        isRestarted: true,
        currentStep: 9, // Mark as fully completed
        step9CompletedAt: new Date(),
      },
    });

    // Create new workflow starting from step 1 with COUNTER_PROPOSAL status
    // agreedPrice is null to force new price negotiation
    const newWorkflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId: workflow.influencerId,
        currentStep: 1,
        status: 'ACTIVE',
        agreedPrice: null, // NULL - needs new price input
        contactEmail: workflow.contactEmail,
        contactInstagram: workflow.contactInstagram,
        contactWhatsapp: workflow.contactWhatsapp,
        isRestarted: false,
        previousWorkflowId: workflow.id,
      },
    });

    // Update influencer status to COUNTER_PROPOSAL for new negotiation
    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'COUNTER_PROPOSAL' },
    });

    logger.info('[PARTNERSHIP] Restarted workflow', {
      oldWorkflowId: id,
      newWorkflowId: newWorkflow.id,
      influencerId: workflow.influencerId,
    });

    return NextResponse.json({
      success: true,
      message: 'Partnership restarted successfully',
      data: newWorkflow,
    });

  } catch (error) {
    logger.error('[PARTNERSHIP] Error restarting workflow', error);
    return NextResponse.json(
      { error: 'Failed to restart partnership' },
      { status: 500 }
    );
  }
}
