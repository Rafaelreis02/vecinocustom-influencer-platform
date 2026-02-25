import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/partnerships/[id]/restart - Restart partnership (create new workflow)
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

    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Can only restart from step 5 or completed workflows
    if (workflow.currentStep < 5 && workflow.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only restart from step 5 or completed partnerships' },
        { status: 400 }
      );
    }

    // Mark current workflow as restarted
    await prisma.partnershipWorkflow.update({
      where: { id },
      data: { status: 'RESTARTED' },
    });

    // Create new workflow with copied contact info from step 1
    const newWorkflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId: workflow.influencerId,
        currentStep: 1,
        status: 'ACTIVE',
        isRestarted: true,
        previousWorkflowId: workflow.id,
        // Copy contact info from previous workflow
        contactEmail: workflow.contactEmail,
        contactInstagram: workflow.contactInstagram,
        contactWhatsapp: workflow.contactWhatsapp,
        // Reset all other fields
        agreedPrice: null,
        shippingAddress: null,
        productSuggestion1: null,
        productSuggestion2: null,
        productSuggestion3: null,
        selectedProductUrl: null,
        designProofUrl: null,
        designNotes: null,
        contractSigned: false,
        contractUrl: null,
        trackingUrl: null,
        couponCode: null,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Reset influencer status to ANALYZING
    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'ANALYZING' },
    });

    return NextResponse.json({
      success: true,
      message: 'Partnership restarted successfully',
      data: newWorkflow,
      previousWorkflowId: workflow.id,
    });
  } catch (error) {
    console.error('Error restarting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to restart workflow' },
      { status: 500 }
    );
  }
}
