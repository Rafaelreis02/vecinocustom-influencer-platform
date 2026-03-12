import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateInfluencerStatus } from '@/lib/status-email';
import { logger } from '@/lib/logger';

/**
 * REGRA DE OURO:
 * O email só é enviado quando NÓS avançamos um step manualmente.
 * Ações do influencer no portal NÃO disparam email de confirmação para ele próprio.
 *
 * Steps que NÓS podemos avançar (canAdminAdvance: true):
 *   Step 3 → Confirmamos produto selecionado → email STEP_3_PREPARING
 *   Step 7 → Inserimos tracking → email STEP_7_SHIPPED
 *
 * Steps que o INFLUENCER avança no portal (canAdminAdvance: false):
 *   Step 1 → Influencer aceita proposta
 *   Step 2 → Influencer preenche morada e sugestões
 *   Step 5 → Influencer assina contrato (via accept-contract API)
 *   Step 6 → (intermediário pós-contrato, gerido internamente)
 */
const STEP_CONFIG: Record<number, {
  name: string;
  status: string;
  adminRequiredFields: string[];
  nextStep: number | null;
  nextStatus: string | null;
  canAdminAdvance: boolean;
}> = {
  1: {
    name: 'Partnership (Proposta)',
    status: 'ANALYZING',
    adminRequiredFields: [],
    nextStep: 2,
    nextStatus: 'AGREED',
    canAdminAdvance: false, // Influencer aceita no portal
  },
  2: {
    name: 'Shipping (Dados de envio)',
    status: 'AGREED',
    adminRequiredFields: [],
    nextStep: 3,
    nextStatus: 'PRODUCT_SELECTION',
    canAdminAdvance: false, // Influencer preenche morada no portal
  },
  3: {
    name: 'Preparing (Produto confirmado)',
    status: 'PRODUCT_SELECTION',
    adminRequiredFields: ['selectedProductUrl'], // Nós confirmamos o produto
    nextStep: 4,
    nextStatus: 'CONTRACT_PENDING',
    canAdminAdvance: true, // NÓS avançamos → dispara STEP_3_PREPARING
  },
  4: {
    name: 'Design Review',
    status: 'CONTRACT_PENDING',
    adminRequiredFields: [],
    nextStep: 5,
    nextStatus: 'CONTRACT_PENDING', // Mantém status — design é um sub-estado
    canAdminAdvance: false, // Gerido via design-messages API
  },
  5: {
    name: 'Contract (Contrato)',
    status: 'CONTRACT_PENDING',
    adminRequiredFields: [],
    nextStep: null,
    nextStatus: null,
    canAdminAdvance: false, // Influencer assina no portal via accept-contract
  },
  6: {
    name: 'Preparing Shipment (A preparar envio)',
    status: 'CONTRACT_SIGNED',
    adminRequiredFields: ['trackingUrl'], // Nós inserimos o tracking
    nextStep: 7,
    nextStatus: 'SHIPPED',
    canAdminAdvance: true, // NÓS avançamos → dispara STEP_7_SHIPPED
  },
  7: {
    name: 'Shipped (Enviado)',
    status: 'SHIPPED',
    adminRequiredFields: [],
    nextStep: null,
    nextStatus: 'COMPLETED',
    canAdminAdvance: true, // NÓS marcamos como concluído
  },
};

function validateAdminStep(
  workflow: any,
  step: number
): { valid: boolean; missing: string[]; canAdvance: boolean } {
  const config = STEP_CONFIG[step];
  if (!config) return { valid: false, missing: [], canAdvance: false };

  if (!config.canAdminAdvance) {
    return { valid: false, missing: [], canAdvance: false };
  }

  const missing: string[] = [];
  for (const field of config.adminRequiredFields) {
    const value = workflow[field];
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing, canAdvance: true };
}

// POST /api/partnerships/[id]/advance - Admin avança o workflow para o próximo step
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
      include: { influencer: true },
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
          error: 'Este step é avançado pelo influencer através do portal, não pelo admin.',
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

    // Step final (Step 7: marcar como COMPLETED)
    if (config.nextStep === null) {
      const updatedWorkflow = await prisma.partnershipWorkflow.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          [`step${currentStep}CompletedAt`]: new Date(),
        },
        include: {
          influencer: {
            select: { id: true, name: true, email: true, instagramHandle: true },
          },
        },
      });

      await updateInfluencerStatus(
        workflow.influencerId,
        'COMPLETED',
        session.user.id || 'system'
      );

      logger.info('[ADVANCE] Workflow completed', { workflowId: id, step: currentStep });

      return NextResponse.json({
        success: true,
        message: 'Partnership marcada como concluída.',
        data: updatedWorkflow,
      });
    }

    // Avançar step (gravar estado primeiro, depois enviar email)
    const now = new Date();
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

    // Enviar email via transição de status
    const statusResult = await updateInfluencerStatus(
      workflow.influencerId,
      config.nextStatus!,
      session.user.id || 'system'
    );

    logger.info('[ADVANCE] Step advanced', {
      workflowId: id,
      fromStep: currentStep,
      toStep: config.nextStep,
      emailSent: statusResult.emailResult?.emailSent,
    });

    return NextResponse.json({
      success: true,
      message: `Avançado de ${config.name} para o step ${config.nextStep}.`,
      data: updatedWorkflow,
      emailSent: statusResult.emailResult?.emailSent || false,
      emailError: statusResult.emailResult?.error || null,
    });
  } catch (error: any) {
    logger.error('[ADVANCE] Error', { error: error.message });
    return NextResponse.json({ error: 'Failed to advance workflow' }, { status: 500 });
  }
}
