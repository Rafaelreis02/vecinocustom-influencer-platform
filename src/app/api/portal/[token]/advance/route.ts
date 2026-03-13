import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/portal/[token]/advance - Influencer avança o workflow no portal
 *
 * Ações do influencer — SEM email de confirmação para ele próprio.
 * O email é enviado quando NÓS agimos, não quando ele age.
 *
 * Steps que o influencer pode avançar:
 *   Step 1 → aceita proposta → avança para Step 2 (AGREED)
 *   Step 2 → preenche morada → avança para Step 3 (PRODUCT_SELECTION)
 *   Step 4 → assina contrato → avança para Step 6 (CONTRACT_SIGNED)
 */

const INFLUENCER_ADVANCE_STEPS = [1, 2, 4];

const STEP_REQUIREMENTS: Record<number, string[]> = {
  1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'],
  2: ['shippingAddress', 'productSuggestion1'],
  4: ['contractSigned'],
};

const NEXT_STEPS: Record<number, { step: number; status: string }> = {
  1: { step: 2, status: 'AGREED' },
  2: { step: 3, status: 'PRODUCT_SELECTION' },
  4: { step: 6, status: 'CONTRACT_SIGNED' },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: { id: true, name: true, email: true },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Invalid portal link' }, { status: 404 });
    }

    // Buscar workflow ativo
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { influencerId: influencer.id },
      orderBy: { createdAt: 'desc' },
    });

    const workflow = workflows.find(w => w.status === 'ACTIVE' || (w.status as any) === 'ACTIVE');

    if (!workflow) {
      return NextResponse.json({ error: 'No active partnership found' }, { status: 404 });
    }

    const currentStep = workflow.currentStep;

    if (!INFLUENCER_ADVANCE_STEPS.includes(currentStep)) {
      return NextResponse.json(
        { error: 'This step can only be advanced by VecinoCustom team' },
        { status: 403 }
      );
    }

    // === FIX: Guardar dados recebidos no workflow PRIMEIRO ===
    const body = await req.json().catch(() => ({}));
    
    // Atualizar workflow com dados do body (se existirem)
    if (body && Object.keys(body).length > 0) {
      await prisma.partnershipWorkflow.update({
        where: { id: workflow.id },
        data: body,
      });
      
      logger.info('[PORTAL ADVANCE] Updated workflow with data', {
        workflowId: workflow.id,
        step: currentStep,
        fields: Object.keys(body),
      });
      
      // Recarregar workflow para validar com dados atualizados
      const updatedWorkflow = await prisma.partnershipWorkflow.findUnique({
        where: { id: workflow.id },
      });
      
      if (updatedWorkflow) {
        Object.assign(workflow, updatedWorkflow);
      }
    }
    // ========================================================

    // Validar campos obrigatórios
    const missing: string[] = [];
    for (const field of STEP_REQUIREMENTS[currentStep] || []) {
      const value = workflow[field as keyof typeof workflow];
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
      if (field === 'contractSigned' && value !== true) {
        if (!missing.includes(field)) missing.push(field);
      }
    }

    if (missing.length > 0) {
      return NextResponse.json({ error: 'Missing required fields', missing }, { status: 400 });
    }

    const next = NEXT_STEPS[currentStep];

    // Avançar workflow
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: next.step,
        [`step${currentStep}CompletedAt`]: new Date(),
      },
    });

    // Atualizar status do influencer (sem email — é ação dele)
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: next.status as any },
    });

    logger.info('[PORTAL ADVANCE] Step advanced by influencer', {
      influencerId: influencer.id,
      fromStep: currentStep,
      toStep: next.step,
      newStatus: next.status,
    });

    return NextResponse.json({
      success: true,
      message: `Advanced to step ${next.step}`,
      data: { currentStep: next.step, status: next.status },
    });
  } catch (error) {
    logger.error('POST /api/portal/[token]/advance failed', error);
    return NextResponse.json({ error: 'Failed to advance step' }, { status: 500 });
  }
}
