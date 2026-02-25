import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendWorkflowEmail } from '@/lib/partnership-email';

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

    // Find active workflow
    const workflow = await prisma.partnershipWorkflow.findFirst({
      where: {
        influencerId: influencer.id,
        status: 'ACTIVE',
      },
    });

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
    const nextSteps: Record<number, { step: number; status: string }> = {
      1: { step: 2, status: 'AGREED' },
      2: { step: 3, status: 'PRODUCT_SELECTION' },
      4: { step: 5, status: 'SHIPPED' },
    };

    const next = nextSteps[currentStep];
    if (!next) {
      return NextResponse.json(
        { error: 'Cannot advance from this step' },
        { status: 400 }
      );
    }

    // Send email notification before advancing
    const variables = {
      nome: influencer.name,
      valor: workflow.agreedPrice?.toString() || '0',
      email: workflow.contactEmail || influencer.email,
      instagram: workflow.contactInstagram,
      whatsapp: workflow.contactWhatsapp,
      morada: workflow.shippingAddress,
      sugestao1: workflow.productSuggestion1,
      sugestao2: workflow.productSuggestion2,
      sugestao3: workflow.productSuggestion3,
    };

    await sendWorkflowEmail(
      workflow.id,
      currentStep,
      variables,
      'system'
    );

    // Update workflow
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: next.step,
        [`step${currentStep}CompletedAt`]: new Date(),
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: next.status as any },
    });

    return NextResponse.json({
      success: true,
      message: `Advanced to step ${next.step}`,
      data: {
        currentStep: next.step,
        status: next.status,
      },
    });
  } catch (error) {
    logger.error('POST /api/portal/[token]/advance failed', error);
    return NextResponse.json(
      { error: 'Failed to advance step' },
      { status: 500 }
    );
  }
}
