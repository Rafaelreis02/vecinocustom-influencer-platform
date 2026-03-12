import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { InfluencerStatus } from '@prisma/client';

// POST /api/portal/[token]/restart-partnership - Restart partnership from portal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: { 
        id: true, 
        name: true,
        email: true,
        instagramHandle: true,
        tiktokHandle: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find and complete current workflow
    const currentWorkflow = await prisma.partnershipWorkflow.findFirst({
      where: { 
        influencerId: influencer.id,
        status: 'ACTIVE',
      },
    });

    if (currentWorkflow) {
      // Mark current workflow as completed
      await prisma.partnershipWorkflow.update({
        where: { id: currentWorkflow.id },
        data: { 
          status: 'COMPLETED',
          currentStep: 9,
          step9CompletedAt: new Date(),
        },
      });
    }

    // Create new workflow
    const newWorkflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId: influencer.id,
        currentStep: 1,
        status: 'ACTIVE',
        agreedPrice: 0,
      },
    });

    // Reset influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: InfluencerStatus.ANALYZING },
    });

    logger.info('Partnership restarted from portal', {
      influencerId: influencer.id,
      oldWorkflowId: currentWorkflow?.id,
      newWorkflowId: newWorkflow.id,
    });

    return NextResponse.json({
      success: true,
      message: 'New partnership started',
      data: {
        workflowId: newWorkflow.id,
        currentStep: 1,
        status: 'ACTIVE',
      },
    });
  } catch (error: any) {
    logger.error('Error restarting partnership:', error);
    return NextResponse.json(
      { error: 'Failed to restart partnership: ' + error.message },
      { status: 500 }
    );
  }
}
