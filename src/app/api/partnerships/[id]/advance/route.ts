import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';

// Step configuration with validation rules and status mapping
const STEP_CONFIG: Record<number, {
  name: string;
  status: string;
  requiredFields: string[];
  nextStep: number | null;
  nextStatus: string | null;
}> = {
  1: {
    name: 'Partnership',
    status: 'ANALYZING',
    requiredFields: ['agreedPrice', 'contactEmail', 'contactInstagram', 'contactWhatsapp'],
    nextStep: 2,
    nextStatus: 'AGREED',
  },
  2: {
    name: 'Shipping',
    status: 'AGREED',
    requiredFields: ['shippingAddress', 'productSuggestion1'],
    nextStep: 3,
    nextStatus: 'PRODUCT_SELECTION',
  },
  3: {
    name: 'Preparing',
    status: 'PRODUCT_SELECTION',
    requiredFields: ['selectedProductUrl'],
    nextStep: 4,
    nextStatus: 'CONTRACT_PENDING',
  },
  4: {
    name: 'Contract',
    status: 'CONTRACT_PENDING',
    requiredFields: ['contractSigned'],
    nextStep: 5,
    nextStatus: 'SHIPPED',
  },
  5: {
    name: 'Shipped',
    status: 'SHIPPED',
    requiredFields: ['trackingUrl', 'couponCode'],
    nextStep: null,
    nextStatus: 'COMPLETED',
  },
};

// Validate that all required fields are present and not empty
function validateStep(workflow: any, step: number): { valid: boolean; missing: string[] } {
  const config = STEP_CONFIG[step];
  const missing: string[] = [];

  for (const field of config.requiredFields) {
    const value = workflow[field];
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
    // For boolean fields, false is valid but null/undefined is not
    if (field === 'contractSigned' && value !== true && value !== false) {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing };
}

// Email sending is now handled by @/lib/partnership-email

// POST /api/partnerships/[id]/advance - Advance to next step
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
        influencer: true,
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
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    // Validate required fields for current step
    const validation = validateStep(workflow, currentStep);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missing: validation.missing,
          step: currentStep,
          stepName: config.name,
        },
        { status: 400 }
      );
    }

    // Check if this is the final step
    if (config.nextStep === null) {
      // Complete the workflow
      const updatedWorkflow = await prisma.partnershipWorkflow.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          [`step${currentStep}CompletedAt`]: new Date(),
        },
        include: {
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
              instagramHandle: true,
            },
          },
        },
      });

      // Also update influencer status
      await prisma.influencer.update({
        where: { id: workflow.influencerId },
        data: { status: 'COMPLETED' },
      });

      return NextResponse.json({
        success: true,
        message: 'Partnership completed successfully',
        data: updatedWorkflow,
      });
    }

    // Send email for current step
    const variables: Record<string, any> = {
      nome: workflow.influencer.name,
      valor: workflow.agreedPrice?.toString() || '0',
      email: workflow.contactEmail,
      instagram: workflow.contactInstagram,
      whatsapp: workflow.contactWhatsapp,
      morada: workflow.shippingAddress,
      sugestao1: workflow.productSuggestion1,
      sugestao2: workflow.productSuggestion2,
      sugestao3: workflow.productSuggestion3,
      url_produto: workflow.selectedProductUrl,
      url_contrato: workflow.contractUrl,
      tracking_url: workflow.trackingUrl,
      cupom: workflow.couponCode,
    };

    const emailResult = await sendWorkflowEmail(
      id,
      currentStep,
      variables,
      session.user.id || 'system'
    );

    // Advance to next step
    const now = new Date();
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        currentStep: config.nextStep,
        [`step${currentStep}CompletedAt`]: now,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
          },
        },
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: config.nextStatus as any },
    });

    return NextResponse.json({
      success: true,
      message: `Advanced from ${config.name} to ${STEP_CONFIG[config.nextStep].name}`,
      data: updatedWorkflow,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('Error advancing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to advance workflow' },
      { status: 500 }
    );
  }
}
