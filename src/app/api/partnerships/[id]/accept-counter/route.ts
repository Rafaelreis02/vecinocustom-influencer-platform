import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateInfluencerStatus } from '@/lib/status-email';

// POST /api/partnerships/[id]/accept-counter - Accept influencer counterproposal
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
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { id },
    });

    const workflow = workflows[0];

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update workflow status to ACTIVE and step
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        currentStep: 2,
        step1CompletedAt: new Date(),
      },
    });

    // Update influencer status to AGREED
    // This will automatically send the Step 2 email via status transition
    const statusResult = await updateInfluencerStatus(
      workflow.influencerId,
      'AGREED',
      session.user.id || 'system'
    );

    return NextResponse.json({
      success: true,
      message: 'Counterproposal accepted',
      data: {
        ...updatedWorkflow,
        influencerStatus: statusResult.newStatus,
      },
      emailSent: statusResult.emailResult?.emailSent || false,
      emailError: statusResult.emailResult?.error || null,
    });
  } catch (error: any) {
    console.error('Error accepting counterproposal:', error);
    return NextResponse.json(
      { error: 'Failed to accept counterproposal: ' + error.message },
      { status: 500 }
    );
  }
}
