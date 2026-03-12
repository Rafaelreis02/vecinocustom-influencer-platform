import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { updateInfluencerStatus } from '@/lib/status-email';

// Steps that influencer can advance
const INFLUENCER_ADVANCE_STEPS = [1, 2, 4];

// Required fields for each step (from influencer perspective)
const STEP_REQUIREMENTS: Record<number, string[]> = {
  1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'],
  2: ['shippingAddress', 'productSuggestion1'],
  4: ['contractSigned'], // Influencer confirms contract is signed
};

// POST /api/portal/[token]/advance - Advance workflow step from portal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: { id: true, name: true, email: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find workflows and filter for active one (avoid enum comparison issues)
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: {
        influencerId: influencer.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workflow = workflows.find(w => w.status === 'ACTIVE' || (w.status as any) === 'ACTIVE');

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found' },
        { status: 404 }
      );
    }

    const currentStep = workflow.currentStep;

    // Check if influencer can advance this step
    if (!INFLUENCER_ADVANCE_STEPS.includes(currentStep)) {
      return NextResponse.json(
        { error: 'This step can only be advanced by VecinoCustom team' },
        { status: 403 }
      );
    }

    // Check required fields
    const requiredFields = STEP_REQUIREMENTS[currentStep];
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      const value = workflow[field as keyof typeof workflow];
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
      // Special check for contractSigned
      if (field === 'contractSigned' && value !== true) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', missing },
        { status: 400 }
      );
    }

    // Determine next step and status
    // NOTA: estas transições são ações do influencer → NÃO disparam email de confirmação
    // (as transições removidas do STATUS_TRANSITION_EMAILS garantem isso)
    const nextSteps: Record<number, { step: number; status: string }> = {
      1: { step: 2, status: 'AGREED' },               // Influencer aceita proposta
      2: { step: 3, status: 'PRODUCT_SELECTION' },    // Influencer preenche morada
      4: { step: 6, status: 'CONTRACT_SIGNED' },       // Influencer assina contrato (via accept-contract)
    };

    const next = nextSteps[currentStep];
    if (!next) {
      return NextResponse.json(
        { error: 'Cannot advance from this step' },
        { status: 400 }
      );
    }

    // Update workflow FIRST
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: next.step,
        [`step${currentStep}CompletedAt`]: new Date(),
      },
    });

    // Update influencer status - this will automatically send email
    const statusResult = await updateInfluencerStatus(
      influencer.id,
      next.status,
      'system'
    );

    return NextResponse.json({
      success: true,
      message: `Advanced to step ${next.step}`,
      data: {
        currentStep: next.step,
        status: next.status,
      },
      emailSent: statusResult.emailResult?.emailSent || false,
      emailError: statusResult.emailResult?.error || null,
    });
  } catch (error) {
    logger.error('POST /api/portal/[token]/advance failed', error);
    return NextResponse.json(
      { error: 'Failed to advance step' },
      { status: 500 }
    );
  }
}
