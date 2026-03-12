import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';
import { logger } from '@/lib/logger';

/**
 * REGRA DE OURO:
 * O admin clica num botão → avança o step → email enviado diretamente.
 * Não dependemos de transições de status. Botão clicado = email garantido.
 *
 * Steps que o ADMIN pode avançar (com email associado):
 *   Step 3 → Produto confirmado → email STEP_3_PREPARING
 *   Step 6 → Enviado com tracking → email STEP_7_SHIPPED
 *   Step 7 → Completar parceria → sem email (só marca como concluído)
 *
 * Steps que o INFLUENCER avança no portal (sem intervenção do admin):
 *   Step 1 → Influencer aceita proposta
 *   Step 2 → Influencer preenche morada e sugestões
 *   Step 5 → Influencer assina contrato (via accept-contract)
 */
const STEP_CONFIG: Record<number, {
  name: string;
  adminRequiredFields: string[];
  nextStep: number | null;
  nextStatus: string | null;
  emailStep: number | null; // step do template a enviar (null = sem email)
  canAdminAdvance: boolean;
}> = {
  1: {
    name: 'Partnership (Proposta)',
    adminRequiredFields: [],
    nextStep: 2,
    nextStatus: 'AGREED',
    emailStep: null,
    canAdminAdvance: false, // Influencer aceita no portal
  },
  2: {
    name: 'Shipping (Dados de envio)',
    adminRequiredFields: [],
    nextStep: 3,
    nextStatus: 'PRODUCT_SELECTION',
    emailStep: null,
    canAdminAdvance: false, // Influencer preenche morada no portal
  },
  3: {
    name: 'Preparing (Produto confirmado)',
    adminRequiredFields: ['selectedProductUrl'],
    nextStep: 4,
    nextStatus: 'CONTRACT_PENDING',
    emailStep: 3, // envia STEP_3_PREPARING
    canAdminAdvance: true,
  },
  4: {
    name: 'Design Review',
    adminRequiredFields: [],
    nextStep: 5,
    nextStatus: 'CONTRACT_PENDING',
    emailStep: null, // emails do design enviados via design-messages
    canAdminAdvance: false,
  },
  5: {
    name: 'Contract (Contrato)',
    adminRequiredFields: [],
    nextStep: null,
    nextStatus: null,
    emailStep: null,
    canAdminAdvance: false, // Influencer assina no portal via accept-contract
  },
  6: {
    name: 'Preparing Shipment (A preparar envio)',
    adminRequiredFields: ['trackingUrl'],
    nextStep: 7,
    nextStatus: 'SHIPPED',
    emailStep: 7, // envia STEP_7_SHIPPED
    canAdminAdvance: true,
  },
  7: {
    name: 'Shipped (Enviado)',
    adminRequiredFields: [],
    nextStep: null,
    nextStatus: 'COMPLETED',
    emailStep: null, // sem email ao completar
    canAdminAdvance: true,
  },
};

function validateAdminStep(
  workflow: any,
  step: number
): { valid: boolean; missing: string[]; canAdvance: boolean } {
  const config = STEP_CONFIG[step];
  if (!config) return { valid: false, missing: [], canAdvance: false };
  if (!config.canAdminAdvance) return { valid: false, missing: [], canAdvance: false };

  const missing: string[] = [];
  for (const field of config.adminRequiredFields) {
    const value = workflow[field];
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing, canAdvance: true };
}

// POST /api/partnerships/[id]/advance - Admin avança o workflow
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
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            portalToken: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Cannot advance workflow with status: ${workflow.status}` },
        { status: 400 }
      );
    }

    const currentStep = workflow.currentStep;
    const config = STEP_CONFIG[currentStep];

    if (!config) {
      return NextResponse.json({ error: `Invalid step: ${currentStep}` }, { status: 400 });
    }

    const validation = validateAdminStep(workflow, currentStep);

    if (!validation.canAdvance) {
      return NextResponse.json(
        {
          error: 'Este step é avançado pelo influencer através do portal.',
          step: currentStep,
          stepName: config.name,
        },
        { status: 403 }
      );
    }

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios em falta para avançar este step.',
          missing: validation.missing,
          step: currentStep,
          stepName: config.name,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Step final (Step 7: marcar como COMPLETED)
    if (config.nextStep === null) {
      const updatedWorkflow = await prisma.partnershipWorkflow.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          [`step${currentStep}CompletedAt`]: now,
        },
        include: {
          influencer: {
            select: { id: true, name: true, email: true, instagramHandle: true },
          },
        },
      });

      await prisma.influencer.update({
        where: { id: workflow.influencerId },
        data: { status: 'COMPLETED' as any },
      });

      logger.info('[ADVANCE] Workflow completed', { workflowId: id, step: currentStep });

      return NextResponse.json({
        success: true,
        message: 'Partnership marcada como concluída.',
        data: updatedWorkflow,
        emailSent: false,
      });
    }

    // Avançar step (gravar estado primeiro, depois enviar email)
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        currentStep: config.nextStep,
        [`step${currentStep}CompletedAt`]: now,
      },
      include: {
        influencer: {
          select: { id: true, name: true, email: true, instagramHandle: true },
        },
      },
    });

    // Atualizar status do influencer
    if (config.nextStatus) {
      await prisma.influencer.update({
        where: { id: workflow.influencerId },
        data: { status: config.nextStatus as any },
      });
    }

    // Enviar email diretamente se este step tem email associado
    // Botão clicado = email garantido, sem depender de transições de status
    let emailSent = false;
    let emailError: string | null = null;

    if (config.emailStep !== null && workflow.influencer.email) {
      const emailResult = await sendWorkflowEmail(
        id,
        config.emailStep,
        {
          nome: workflow.influencer.name,
          email: workflow.influencer.email,
          instagram: workflow.influencer.instagramHandle || undefined,
          portalToken: workflow.influencer.portalToken || undefined,
          tracking_url: (workflow as any).trackingUrl || undefined,
          cupom: (workflow as any).couponCode || undefined,
          url_produto: (workflow as any).selectedProductUrl || undefined,
          valor: workflow.agreedPrice?.toString() || '0',
        },
        session.user.id || 'system'
      );

      emailSent = emailResult.success;
      emailError = emailResult.error || null;

      logger.info('[ADVANCE] Email sent', {
        workflowId: id,
        step: currentStep,
        emailStep: config.emailStep,
        emailSent,
        emailError,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Avançado de Step ${currentStep} para Step ${config.nextStep}.`,
      data: updatedWorkflow,
      emailSent,
      emailError,
    });
  } catch (error: any) {
    logger.error('[ADVANCE] Error', { error: error.message });
    return NextResponse.json({ error: 'Failed to advance workflow' }, { status: 500 });
  }
}
