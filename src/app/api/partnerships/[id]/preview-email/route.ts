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

    // Determine which template will be used
    const specificKey = hasValue
      ? `STEP_${currentStep}_WITH_VALUE`
      : `STEP_${currentStep}_NO_VALUE`;

    let template = await prisma.emailTemplate.findUnique({
      where: { key: specificKey },
    });

    // Fallback to generic
    if (!template) {
      template = await prisma.emailTemplate.findUnique({
        where: { key: `STEP_${currentStep}` },
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
