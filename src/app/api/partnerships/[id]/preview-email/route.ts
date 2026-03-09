import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/partnerships/[id]/preview-email
 * Preview the email that will be sent when advancing to next step
 */
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

    // Get workflow with all data
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const currentStep = workflow.currentStep;
    const hasValue = (workflow.agreedPrice || 0) > 0;

    // Get product name if step 3 or 6
    let productName = '';
    if ((currentStep === 3 || currentStep === 6) && workflow.selectedProductUrl) {
      try {
        const urlParts = workflow.selectedProductUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        productName = lastPart?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
      } catch (e) {
        productName = 'Produto Selecionado';
      }
    }

    // Get template using same logic as sendWorkflowEmail
    let template = null;
    
    // Step 1: Partnership
    if (currentStep === 1) {
      const key = hasValue ? 'STEP_1_PARTNERSHIP_WITH_VALUE' : 'STEP_1_PARTNERSHIP_NO_VALUE';
      template = await prisma.emailTemplate.findUnique({ where: { key } });
    }
    // Step 2: Shipping
    else if (currentStep === 2) {
      const key = hasValue ? 'STEP_2_SHIPPING_WITH_VALUE' : 'STEP_2_SHIPPING_NO_VALUE';
      template = await prisma.emailTemplate.findUnique({ where: { key } });
    }
    // Step 3: Preparing - try specific, then generic
    else if (currentStep === 3) {
      const specificKey = hasValue ? 'STEP_3_PREPARING_WITH_VALUE' : 'STEP_3_PREPARING_NO_VALUE';
      template = await prisma.emailTemplate.findUnique({ where: { key: specificKey } });
      if (!template) {
        template = await prisma.emailTemplate.findUnique({ where: { key: 'STEP_3_PREPARING' } });
      }
    }
    // Step 4: Design Review - check if first design or revision
    else if (currentStep === 4) {
      const messageCount = await prisma.designMessage.count({
        where: { workflowId: id, senderType: 'ADMIN' },
      });
      const isFirstDesign = messageCount === 0;
      const key = isFirstDesign ? 'DESIGN_REVIEW_FIRST' : 'DESIGN_REVIEW_REVISION';
      template = await prisma.emailTemplate.findUnique({ where: { key } });
      // Fallback to old template if new ones don't exist
      if (!template) {
        template = await prisma.emailTemplate.findUnique({ where: { key: 'STEP_4_CONTRACT' } });
      }
    }
    // Step 5: Shipped - only generic exists
    else if (currentStep === 5) {
      template = await prisma.emailTemplate.findUnique({ where: { key: 'STEP_5_SHIPPED' } });
    }
    // Step 6: Delivered
    else if (currentStep === 6) {
      const key = hasValue ? 'STEP_6_DELIVERED_WITH_VALUE' : 'STEP_6_DELIVERED_NO_VALUE';
      template = await prisma.emailTemplate.findUnique({ where: { key } });
    }
    
    // Final fallback: any active template for this step
    if (!template) {
      template = await prisma.emailTemplate.findFirst({
        where: { step: currentStep, isActive: true },
      });
    }

    if (!template) {
      return NextResponse.json(
        { error: `No template found for step ${currentStep}` },
        { status: 404 }
      );
    }

    // Prepare variables (same as when sending)
    const variables: Record<string, any> = {
      nome: workflow.influencer.name,
      valor: workflow.agreedPrice?.toString() || '0',
      email: workflow.contactEmail,
      instagram: workflow.contactInstagram,
      whatsapp: workflow.contactWhatsapp,
      portalToken: workflow.influencer.portalToken,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom.com'}/portal/${workflow.influencer.portalToken}`,
    };

    // Step-specific variables
    if (currentStep === 1) {
      variables.cupom = '';
      variables.morada = '';
    } else if (currentStep === 2) {
      variables.cupom = '';
      variables.morada = workflow.shippingAddress || '';
      variables.sugestao1 = workflow.productSuggestion1 || '';
      variables.sugestao2 = workflow.productSuggestion2 || '';
      variables.sugestao3 = workflow.productSuggestion3 || '';
    } else if (currentStep >= 3) {
      variables.cupom = workflow.couponCode || '';
      variables.morada = workflow.shippingAddress || '';
      variables.url_produto = workflow.selectedProductUrl || '';
      variables.nome_produto = productName;
      variables.sugestao1 = workflow.productSuggestion1 || '';
      variables.sugestao2 = workflow.productSuggestion2 || '';
      variables.sugestao3 = workflow.productSuggestion3 || '';
    }
    
    if (currentStep >= 4) {
      variables.url_contrato = workflow.contractUrl || '';
    }
    
    if (currentStep >= 6) {
      variables.tracking_url = workflow.trackingUrl || '';
    }

    // Render template
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'gi');
      subject = subject.replace(regex, String(value || ''));
      body = body.replace(regex, String(value || ''));
    }

    return NextResponse.json({
      success: true,
      data: {
        step: currentStep,
        stepName: template.name,
        templateKey: template.key,
        hasValue,
        agreedPrice: workflow.agreedPrice,
        subject,
        body,
        variables,
      },
    });
  } catch (error: any) {
    logger.error('[WORKFLOW] Error generating email preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview: ' + error.message },
      { status: 500 }
    );
  }
}
