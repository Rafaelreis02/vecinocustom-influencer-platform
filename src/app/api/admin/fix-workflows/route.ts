import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Step to Status mapping - what status SHOULD be at each step
const STEP_STATUS_MAP: Record<number, string> = {
  1: 'ANALYZING',
  2: 'AGREED',
  3: 'PRODUCT_SELECTION',
  4: 'DESIGN_REVIEW',
  5: 'CONTRACT_PENDING',
  6: 'CONTRACT_SIGNED',
  7: 'SHIPPED',
  8: 'DELIVERED',
  9: 'COMPLETED',
};

// GET /api/admin/fix-workflows - Check and fix inconsistent workflows
export async function GET(
  req: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all active workflows
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { status: 'ACTIVE' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const issues: Array<{
      workflowId: string;
      influencerName: string;
      currentStep: number;
      expectedStatus: string;
      actualStatus: string;
      fixed: boolean;
    }> = [];

    for (const workflow of workflows) {
      const expectedStatus = STEP_STATUS_MAP[workflow.currentStep];
      const actualStatus = workflow.influencer.status;

      // Check if status matches the step
      if (expectedStatus && actualStatus !== expectedStatus) {
        // Try to fix it
        try {
          await prisma.influencer.update({
            where: { id: workflow.influencerId },
            data: { status: expectedStatus as any },
          });

          issues.push({
            workflowId: workflow.id,
            influencerName: workflow.influencer.name,
            currentStep: workflow.currentStep,
            expectedStatus,
            actualStatus,
            fixed: true,
          });

          logger.info('Fixed inconsistent workflow', {
            workflowId: workflow.id,
            influencerId: workflow.influencerId,
            oldStatus: actualStatus,
            newStatus: expectedStatus,
            step: workflow.currentStep,
          });
        } catch (fixError) {
          issues.push({
            workflowId: workflow.id,
            influencerName: workflow.influencer.name,
            currentStep: workflow.currentStep,
            expectedStatus,
            actualStatus,
            fixed: false,
          });

          logger.error('Failed to fix workflow', {
            workflowId: workflow.id,
            error: fixError,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: workflows.length,
      issuesFound: issues.length,
      fixed: issues.filter(i => i.fixed).length,
      details: issues,
    });
  } catch (error) {
    logger.error('Error checking workflows:', error);
    return NextResponse.json(
      { error: 'Failed to check workflows' },
      { status: 500 }
    );
  }
}
