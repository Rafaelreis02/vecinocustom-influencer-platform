import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';
import { logger } from '@/lib/logger';

// POST /api/partnerships/create - Create new workflow for an influencer
// Botão "Criar Parceria" → cria workflow + envia email Step 1 diretamente.
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

    if (agreedPrice === undefined || agreedPrice === null) {
      return NextResponse.json(
        { error: 'agreedPrice is required (can be 0 for commission-only)' },
        { status: 400 }
      );
    }

    // Buscar influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    if (!influencer.email) {
      return NextResponse.json(
        { error: 'Influencer has no email address. Please add an email first.' },
        { status: 400 }
      );
    }

    const newPrice = parseFloat(agreedPrice);

    // Criar workflow
    const workflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId,
        currentStep: 1,
        status: 'ACTIVE',
        agreedPrice: newPrice,
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

    // Atualizar status do influencer
    // COUNTER_PROPOSAL = influencer a analisar a nossa proposta
    await prisma.influencer.update({
      where: { id: influencerId },
      data: { status: 'COUNTER_PROPOSAL' as any },
    });

    // Enviar email Step 1 diretamente — botão clicado = email garantido
    const emailResult = await sendWorkflowEmail(
      workflow.id,
      1,
      {
        nome: influencer.name,
        valor: newPrice.toString(),
        email: influencer.email,
        instagram: influencer.instagramHandle || undefined,
        portalToken: influencer.portalToken || undefined,
      },
      session.user.id || 'system'
    );

    logger.info('[PARTNERSHIP CREATE] Workflow created', {
      workflowId: workflow.id,
      influencerId,
      agreedPrice: newPrice,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });

    return NextResponse.json(
      {
        success: true,
        data: workflow,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('[PARTNERSHIP CREATE] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to create workflow: ' + error.message },
      { status: 500 }
    );
  }
}
