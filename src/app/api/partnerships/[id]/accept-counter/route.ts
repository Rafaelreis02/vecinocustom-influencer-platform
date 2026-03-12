import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/partnerships/[id]/accept-counter - Accept influencer counterproposal
// Ação: NÓS aceitamos a proposta do influencer.
// Sem email — foi o influencer que propôs, não nós. Avançamos o workflow apenas.
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

    const workflow = await prisma.partnershipWorkflow.findUnique({ where: { id } });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Avançar para Step 2 e atualizar status
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        currentStep: 2,
        step1CompletedAt: new Date(),
      },
    });

    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'AGREED' as any },
    });

    logger.info('[ACCEPT_COUNTER] Counterproposal accepted', {
      workflowId: id,
      influencerId: workflow.influencerId,
    });

    return NextResponse.json({
      success: true,
      message: 'Counterproposal accepted',
      data: updatedWorkflow,
    });
  } catch (error: any) {
    logger.error('[ACCEPT_COUNTER] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to accept counterproposal: ' + error.message },
      { status: 500 }
    );
  }
}
