import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';

// POST /api/partnerships/[id]/send-counter - Send new proposal (renegotiate)
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
    const body = await req.json();
    const { agreedPrice } = body;

    if (agreedPrice === undefined || agreedPrice === null) {
      return NextResponse.json(
        { error: 'agreedPrice is required' },
        { status: 400 }
      );
    }

    // Find the workflow
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { id },
    });

    const workflow = workflows[0];

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update workflow with new price and reset to COUNTER_PROPOSAL
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        agreedPrice: parseFloat(agreedPrice),
      },
    });

    // Update influencer status to COUNTER_PROPOSAL
    const updatedInfluencer = await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'COUNTER_PROPOSAL' },
    });

    // Get influencer data for email
    const influencer = await prisma.influencer.findUnique({
      where: { id: workflow.influencerId },
      select: { name: true, email: true },
    });

    // Send new proposal email
    if (influencer) {
      await sendWorkflowEmail(
        workflow.id,
        1,
        {
          nome: influencer.name,
          valor: agreedPrice.toString(),
          email: workflow.contactEmail || influencer.email || undefined,
        },
        session.user.id || 'system'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'New proposal sent',
      data: {
        ...updatedWorkflow,
        influencerStatus: updatedInfluencer.status,
      },
    });
  } catch (error: any) {
    console.error('Error sending counterproposal:', error);
    return NextResponse.json(
      { error: 'Failed to send new proposal: ' + error.message },
      { status: 500 }
    );
  }
}
