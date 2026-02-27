import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';

// Step configuration with validation rules and status mapping
// canAdminAdvance: true = nós podemos avançar este step
// requiredFields: campos obrigatórios para avançar
const STEP_CONFIG: Record<number, {
  name: string;
  status: string;
  requiredFields: string[];
  adminRequiredFields: string[]; // Campos que NÓS precisamos preencher
  nextStep: number | null;
  nextStatus: string | null;
  canAdminAdvance: boolean;
}> = {
  1: {
    name: 'Partnership',
    status: 'ANALYZING',
    requiredFields: ['agreedPrice', 'contactEmail', 'contactInstagram', 'contactWhatsapp'],
    adminRequiredFields: ['agreedPrice'], // Só valor é obrigatório por nós
    nextStep: 2,
    nextStatus: 'AGREED',
    canAdminAdvance: false, // Influencer avança via portal
  },
  2: {
    name: 'Shipping',
    status: 'AGREED',
    requiredFields: ['shippingAddress', 'productSuggestion1'],
    adminRequiredFields: [], // Nada obrigatório por nós
    nextStep: 3,
    nextStatus: 'PRODUCT_SELECTION',
    canAdminAdvance: false, // Influencer avança via portal
  },
  3: {
    name: 'Preparing',
    status: 'PRODUCT_SELECTION',
    requiredFields: ['selectedProductUrl'],
    adminRequiredFields: ['selectedProductUrl'], // Nós inserimos produto
    nextStep: 4,
    nextStatus: 'CONTRACT_PENDING',
    canAdminAdvance: true, // NÓS avançamos
  },
  4: {
    name: 'Contract',
    status: 'CONTRACT_PENDING',
    requiredFields: ['contractSigned'],
    adminRequiredFields: [], // Nada obrigatório por nós
    nextStep: 5,
    nextStatus: 'SHIPPED',
    canAdminAdvance: false, // Influencer avança via portal
  },
  5: {
    name: 'Shipped',
    status: 'SHIPPED',
    requiredFields: ['trackingUrl', 'couponCode'],
    adminRequiredFields: ['trackingUrl', 'couponCode'], // Nós inserimos tracking + cupom
    nextStep: null,
    nextStatus: 'COMPLETED',
    canAdminAdvance: true, // NÓS avançamos para completar
  },
};

// Validate admin-required fields for the current step
function validateAdminStep(workflow: any, step: number): { valid: boolean; missing: string[]; canAdvance: boolean } {
  const config = STEP_CONFIG[step];
  const missing: string[] = [];

  // Check if admin can advance this step
  if (!config.canAdminAdvance) {
    return { valid: false, missing: [], canAdvance: false };
  }

  // Validate only admin-required fields
  for (const field of config.adminRequiredFields) {
    const value = workflow[field];
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing, canAdvance: true };
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

    // Check if admin can advance this step
    const validation = validateAdminStep(workflow, currentStep);
    if (!validation.canAdvance) {
      return NextResponse.json(
        {
          error: 'Este step só pode ser avançado pelo influencer através do portal',
          step: currentStep,
          stepName: config.name,
        },
        { status: 403 }
      );
    }

    // Validate admin-required fields
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios em falta',
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
      portalToken: workflow.influencer.portalToken,
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
