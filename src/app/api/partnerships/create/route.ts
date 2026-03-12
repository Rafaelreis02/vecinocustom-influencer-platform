import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateInfluencerStatus } from '@/lib/status-email';
import { logger } from '@/lib/logger';

// POST /api/partnerships/create - Create new workflow for an influencer
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { influencerId, agreedPrice } = body;

    if (!influencerId) {
      return NextResponse.json(
        { error: 'influencerId is required' },
        { status: 400 }
      );
    }

    // Validate agreedPrice - cannot be null/undefined
    if (agreedPrice === undefined || agreedPrice === null) {
      return NextResponse.json(
        { error: 'agreedPrice is required (can be 0 for commission-only)' },
        { status: 400 }
      );

    }

    // Check if influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Check if influencer has email
    if (!influencer.email) {
      return NextResponse.json(
        { error: 'Influencer has no email address. Please add an email first.' },
        { status: 400 }
      );
    }

    // Create new workflow starting at step 1
    // Allow multiple workflows - don't check for existing active ones
    const workflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId,
        currentStep: 1,
        status: 'ACTIVE',
        agreedPrice: parseFloat(agreedPrice),
        // Pre-fill contact data from influencer if available
        contactEmail: influencer.email || null,
        contactInstagram: influencer.instagramHandle || null,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            avatarUrl: true,
            portalToken: true,
          },
        },
      },
    });

    // Update influencer status to ANALYZING (they have a proposal to review)
    // This will automatically send the Step 1 email via status transition
    const oldStatus = influencer.status;
    const statusResult = await updateInfluencerStatus(
      influencerId,
      'ANALYZING',
      session.user.id || 'system'
    );

    if (!statusResult.success) {
      logger.warn('[PARTNERSHIP CREATE] Status update failed', {
        workflowId: workflow.id,
        influencerId,
        error: statusResult.error,
      });
    } else {
      logger.info('[PARTNERSHIP CREATE] Workflow created and status updated', {
        workflowId: workflow.id,
        influencerId,
        oldStatus: statusResult.oldStatus,
        newStatus: statusResult.newStatus,
        emailSent: statusResult.emailResult?.emailSent,
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        data: workflow,
        statusUpdated: statusResult.success,
        oldStatus: statusResult.oldStatus,
        emailSent: statusResult.emailResult?.emailSent || false,
        emailError: statusResult.emailResult?.error || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow: ' + error.message },
      { status: 500 }
    );
  }
}
