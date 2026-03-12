import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWorkflowEmail } from '@/lib/partnership-email';
import { logger } from '@/lib/logger';

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
    name: 'Preparing/Product Selection',
    status: 'PRODUCT_SELECTION',
    requiredFields: ['selectedProductUrl', 'couponCode'],
    adminRequiredFields: ['selectedProductUrl', 'couponCode'], // Nós inserimos produto E cupom
    nextStep: 4,
    nextStatus: 'DESIGN_REVIEW', // NOVO status
    canAdminAdvance: true, // ADMIN avança (envia mockup/design)
  },
  4: {
    name: 'Design Review', // NOVO STEP - Aprovar Design
    status: 'DESIGN_REVIEW',
    requiredFields: ['designApproved'],
    adminRequiredFields: [], // Nada obrigatório - aguardamos aprovação do influencer
    nextStep: 5,
    nextStatus: 'CONTRACT_PENDING',
    canAdminAdvance: false, // Influencer avança quando aprova (ou pede revisão)
  },
  5: {
    name: 'Contract',
    status: 'CONTRACT_PENDING',
    requiredFields: ['contractSigned'],
    adminRequiredFields: [], // Nada obrigatório por nós
    nextStep: 6,
    nextStatus: 'CONTRACT_SIGNED', // NOVO: Contrato assinado, a preparar envio
    canAdminAdvance: false, // Influencer avança via portal (aceita contrato)
  },
  6: {
    name: 'Preparing Shipment',
    status: 'CONTRACT_SIGNED', // NOVO status intermediário
    requiredFields: [],
    adminRequiredFields: ['trackingUrl'], // Nós precisamos de tracking para avançar
    nextStep: 7,
    nextStatus: 'SHIPPED', // Muda para SHIPPED quando enviamos
    canAdminAdvance: true, // NÓS avançamos quando enviamos o produto
  },
  7: {
    name: 'Shipped',
    status: 'SHIPPED',
    requiredFields: ['trackingUrl'],
    adminRequiredFields: [], // Step 7 é informativo - produto já foi enviado
    nextStep: 8,
    nextStatus: 'COMPLETED', // Simplificado: Shipped vai direto para Completed
    canAdminAdvance: true, // NÓS avançamos quando queremos concluir
  },
  8: {
    name: 'Completed',
    status: 'COMPLETED',
    requiredFields: [],
    adminRequiredFields: [],
    nextStep: null,
    nextStatus: null,
    canAdminAdvance: true, // NÓS podemos reiniciar
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
    
    logger.info(`[ADVANCE] Step ${currentStep} (${config.name}): canAdminAdvance=${config.canAdminAdvance}, canAdvance=${validation.canAdvance}, valid=${validation.valid}, missing=${validation.missing.join(',')}`);
    
    if (!validation.canAdvance) {
      return NextResponse.json(
        {
          error: 'Este step só pode ser avançado pelo influencer através do portal',
          step: currentStep,
          stepName: config.name,
          canAdminAdvance: config.canAdminAdvance,
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

    // Send email only for specific steps:
    // Steps 1,2,3: Admin actions -> send email
    // Step 4: Design review -> email sent via design-messages API (not here)
    // Step 5: Influencer signs contract -> no email (they know they signed)
    // Step 6: Contract signed confirmed -> send email
    // Step 7: Product shipped -> send email  
    // Step 8: Completed -> no email (end of workflow)
    const STEPS_THAT_SEND_EMAIL = [1, 2, 3, 6, 7];
    let emailResult: { success: boolean; emailId?: string; error?: string } = { success: true };
    
    if (STEPS_THAT_SEND_EMAIL.includes(currentStep)) {
      // Get product name from URL for step 3, 6, or 7 email
      let productName = '';
      if ((currentStep === 3 || currentStep === 6 || currentStep === 7) && workflow.selectedProductUrl) {
        try {
          // Extract product name from URL or fetch from Shopify
          const urlParts = workflow.selectedProductUrl.split('/');
          const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          productName = lastPart?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
        } catch (e) {
          productName = 'Produto Selecionado';
        }
      }

      // Prepare variables for email - different for each step
      const variables: Record<string, any> = {
        nome: workflow.influencer.name,
        valor: workflow.agreedPrice?.toString() || '0',
        email: workflow.contactEmail,
        instagram: workflow.contactInstagram,
        whatsapp: workflow.contactWhatsapp,
        portalToken: workflow.influencer.portalToken,
      };

      // Step-specific variables
      if (currentStep === 1) {
        // Step 1: Initial proposal - NO coupon code yet, just mention benefits
        variables.cupom = '';
        variables.morada = '';
        variables.url_produto = '';
        variables.nome_produto = '';
        variables.url_contrato = '';
        variables.tracking_url = '';
      } else if (currentStep === 2) {
        // Step 2: Agreement made - still no coupon, asks for shipping info
        variables.cupom = '';
        variables.morada = workflow.shippingAddress || '';
        variables.sugestao1 = workflow.productSuggestion1 || '';
        variables.sugestao2 = workflow.productSuggestion2 || '';
        variables.sugestao3 = workflow.productSuggestion3 || '';
        variables.url_produto = '';
        variables.nome_produto = '';
        variables.url_contrato = '';
        variables.tracking_url = '';
      } else if (currentStep === 3) {
        // Step 3: Product selected
        variables.cupom = workflow.couponCode || '';
        variables.morada = workflow.shippingAddress || '';
        variables.url_produto = workflow.selectedProductUrl || '';
        variables.nome_produto = productName;
        variables.sugestao1 = workflow.productSuggestion1 || '';
        variables.sugestao2 = workflow.productSuggestion2 || '';
        variables.sugestao3 = workflow.productSuggestion3 || '';
        variables.url_contrato = '';
        variables.tracking_url = '';
      } else if (currentStep === 6) {
        // Step 6: Contract signed - preparing shipment
        variables.cupom = workflow.couponCode || '';
        variables.morada = workflow.shippingAddress || '';
        variables.url_produto = workflow.selectedProductUrl || '';
        variables.nome_produto = productName;
        variables.url_contrato = workflow.contractUrl || '';
        variables.tracking_url = '';
      } else if (currentStep === 7) {
        // Step 7: Product shipped - include tracking
        variables.cupom = workflow.couponCode || '';
        variables.morada = workflow.shippingAddress || '';
        variables.url_produto = workflow.selectedProductUrl || '';
        variables.nome_produto = productName;
        variables.url_contrato = workflow.contractUrl || '';
        variables.tracking_url = workflow.trackingUrl || '';
      }

      // Log which template will be used
      const hasValue = (workflow.agreedPrice || 0) > 0;
      logger.info(`[WORKFLOW] Step ${currentStep} - hasValue=${hasValue}, agreedPrice=${workflow.agreedPrice}`);

      emailResult = await sendWorkflowEmail(
        id,
        currentStep,
        variables,
        session.user.id || 'system'
      );

      if (!emailResult.success) {
        logger.error(`[WORKFLOW] Email failed for step ${currentStep}:`, emailResult.error);
      }
    }

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

    // Verify the update was successful
    const verifyInfluencer = await prisma.influencer.findUnique({
      where: { id: workflow.influencerId },
      select: { status: true },
    });

    if (verifyInfluencer?.status !== config.nextStatus) {
      logger.error('Status update verification failed', {
        influencerId: workflow.influencerId,
        expectedStatus: config.nextStatus,
        actualStatus: verifyInfluencer?.status,
      });
    }

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
