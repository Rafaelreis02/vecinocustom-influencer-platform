/**
 * Partnership Email Service
 * Handles sending emails for partnership workflow steps
 */

import { getAuthClient, sendEmail as sendGmailEmail } from './gmail';
import { prisma } from './prisma';
import { logger } from './logger';

interface EmailVariables {
  nome?: string;
  valor?: string;
  email?: string;
  instagram?: string;
  whatsapp?: string;
  morada?: string;
  sugestao1?: string;
  sugestao2?: string;
  sugestao3?: string;
  url_produto?: string;
  url_contrato?: string;
  tracking_url?: string;
  cupom?: string;
}

/**
 * Send email for a specific workflow step
 */
export async function sendWorkflowEmail(
  workflowId: string,
  step: number,
  variables: EmailVariables,
  sentBy: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    // Check if Gmail is configured
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      logger.warn('[EMAIL] Gmail not configured, skipping email send');
      return { success: false, error: 'Gmail not configured' };
    }

    // Get workflow with influencer data
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        influencer: true,
      },
    });

    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    // Determine if has value
    const hasValue = (workflow.agreedPrice || 0) > 0;

    // Get email template
    const template = await getEmailTemplate(step, hasValue);
    if (!template) {
      logger.warn(`[EMAIL] No template found for step ${step}, hasValue=${hasValue}`);
      return { success: false, error: 'Template not found' };
    }

    // Prepare email content
    const { subject, body } = renderTemplate(template, variables);

    // Get recipient email
    const toEmail = variables.email || workflow.influencer.email || workflow.contactEmail;
    if (!toEmail) {
      return { success: false, error: 'No recipient email found' };
    }

    // Send email via Gmail
    const auth = getAuthClient();
    const result = await sendGmailEmail(auth, {
      to: toEmail,
      subject,
      body,
    });

    // Record email in database
    await prisma.partnershipEmail.create({
      data: {
        workflowId,
        step,
        templateKey: template.key,
        subject,
        body,
        sentBy,
        variables: variables as any,
      },
    });

    logger.info('[EMAIL] Sent successfully', {
      workflowId,
      step,
      to: toEmail,
      subject,
    });

    return { success: true, emailId: result.id || undefined };
  } catch (error: any) {
    logger.error('[EMAIL] Failed to send', { workflowId, step, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get email template for a specific step
 */
async function getEmailTemplate(step: number, hasValue: boolean) {
  // Try specific template first (with/without value)
  const specificKey = hasValue
    ? `STEP_${step}_WITH_VALUE`
    : `STEP_${step}_NO_VALUE`;

  let template = await prisma.emailTemplate.findUnique({
    where: { key: specificKey },
  });

  // Fallback to generic template
  if (!template) {
    const genericKey = `STEP_${step}`;
    template = await prisma.emailTemplate.findUnique({
      where: { key: genericKey },
    });
  }

  // Fallback to any template for this step
  if (!template) {
    template = await prisma.emailTemplate.findFirst({
      where: { step, isActive: true },
    });
  }

  return template;
}

/**
 * Render template with variables
 */
function renderTemplate(
  template: { subject: string; body: string },
  variables: EmailVariables
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Replace all variables {{key}} with values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    subject = subject.replace(regex, String(value || ''));
    body = body.replace(regex, String(value || ''));
  }

  // Add signature if not present
  if (!body.includes('VecinoCustom')) {
    body += '\n\n---\nCom os melhores cumprimentos,\nEquipa VecinoCustom\nwww.vecinocustom.com';
  }

  return { subject, body };
}

/**
 * Get all email templates
 */
export async function getAllTemplates() {
  return prisma.emailTemplate.findMany({
    orderBy: [{ step: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Update email template
 */
export async function updateTemplate(
  id: string,
  data: { subject?: string; body?: string; isActive?: boolean }
) {
  return prisma.emailTemplate.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Preview template with variables
 */
export function previewTemplate(
  template: { subject: string; body: string },
  variables: EmailVariables
): { subject: string; body: string } {
  return renderTemplate(template, variables);
}

/**
 * Default variables for preview
 */
export const DEFAULT_PREVIEW_VARIABLES: EmailVariables = {
  nome: 'Sofia Silva',
  valor: '150.00',
  email: 'sofia@email.com',
  instagram: '@sofiasilva',
  whatsapp: '+351 912 345 678',
  morada: 'Rua das Flores, 123\n4000-123 Porto\nPortugal',
  sugestao1: 'Pulseira Personalizada com Nome',
  sugestao2: 'Anel de Prata Gravado',
  sugestao3: 'Colar com Iniciais',
  url_produto: 'https://vecinocustom.com/produtos/pulseira-personalizada',
  url_contrato: 'https://docusign.com/contract/abc123',
  tracking_url: 'https://ctt.pt/rastrear/EN123456789PT',
  cupom: 'SOFIA20',
};
