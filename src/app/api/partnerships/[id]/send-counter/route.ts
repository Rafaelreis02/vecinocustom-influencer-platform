import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';
import { logger } from '@/lib/logger';

// POST /api/partnerships/[id]/send-counter - Send new proposal (renegotiate)
// Sempre que este endpoint é chamado (botão "Enviar Proposta"), envia email ao influencer.
// Não depende de transições de status — o clique no botão = email garantido.
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

    // Buscar workflow com dados do influencer
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            portalToken: true,
            status: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (!workflow.influencer.email) {
      return NextResponse.json(
        { error: 'Influencer has no email address' },
        { status: 400 }
      );
    }

    // Atualizar preço e status
    const newPrice = parseFloat(agreedPrice);
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: { agreedPrice: newPrice },
    });

    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'COUNTER_PROPOSAL' as any },
    });

    // Enviar email diretamente — botão clicado = email garantido
    const emailResult = await sendWorkflowEmail(
      id,
      1, // Step 1: Proposta de parceria
      {
        nome: workflow.influencer.name,
        valor: newPrice.toString(),
        email: workflow.influencer.email,
        instagram: workflow.influencer.instagramHandle || undefined,
        portalToken: workflow.influencer.portalToken || undefined,
      },
      session.user.id || 'system'
    );

    logger.info('[SEND_COUNTER] Proposal sent', {
      workflowId: id,
      influencerId: workflow.influencerId,
      agreedPrice: newPrice,
      emailSent: emailResult.success,
    });

    return NextResponse.json({
      success: true,
      message: 'New proposal sent',
      data: updatedWorkflow,
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
    });
  } catch (error: any) {
    logger.error('[SEND_COUNTER] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to send new proposal: ' + error.message },
      { status: 500 }
    );
  }
}
