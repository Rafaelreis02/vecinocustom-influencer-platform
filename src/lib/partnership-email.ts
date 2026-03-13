/**
 * Partnership Email Service
 * Handles sending emails for partnership workflow steps
 * 
 * FIX: Cria cliente Gmail inline para evitar bug googleapis v171.x
 */

import { google } from 'googleapis';
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
  portalToken?: string;
}

/**
 * Send email for a specific workflow step
 * Cria cliente Gmail inline (fix para googleapis v171.x)
 */
export async function sendWorkflowEmail(
  workflowId: string,
  step: number,
  variables: EmailVariables,
  sentBy: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    // Check if Gmail is configured
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
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

    // === FIX: Criar cliente Gmail inline (igual ao /api/emails/compose) ===
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const senderEmail = process.env.GMAIL_USER || 'brand@vecinocustom.com';
    const senderName = 'VecinoCustom';

    // Build email message
    const emailMessage = [
      `From: ${senderName} <${senderEmail}>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(emailMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    // =====================================================================

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
      messageId: result.data.id,
    });

    return { success: true, emailId: result.data.id || undefined };
  } catch (error: any) {
    logger.error('[EMAIL] Failed to send', { workflowId, step, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get email template for a specific step
 *
 * Chaves definitivas do sistema:
 *   step 0 → INITIAL_CONTACT
 *   step 1 → STEP_1_PARTNERSHIP_WITH_VALUE | STEP_1_PARTNERSHIP_NO_VALUE
 *   step 3 → STEP_3_PREPARING
 *   step 4 → não gerido aqui (Design Review enviado via design-messages API)
 *   step 5 → STEP_5_CONTRACT
 *   step 7 → STEP_7_SHIPPED
 */
async function getEmailTemplate(step: number, hasValue: boolean): Promise<any> {
  let template = null;

  // Step 0: Prospecção inicial
  if (step === 0) {
    template = await prisma.emailTemplate.findUnique({ where: { key: 'INITIAL_CONTACT' } });
  }
  // Step 1: Proposta de parceria (com ou sem valor monetário)
  else if (step === 1) {
    const key = hasValue ? 'STEP_1_PARTNERSHIP_WITH_VALUE' : 'STEP_1_PARTNERSHIP_NO_VALUE';
    template = await prisma.emailTemplate.findUnique({ where: { key } });
  }
  // Step 3: Peça em preparação (NÓS confirmámos o produto)
  else if (step === 3) {
    template = await prisma.emailTemplate.findUnique({ where: { key: 'STEP_3_PREPARING' } });
  }
  // Step 4: Design Review — enviado pela design-messages API, não aqui
  else if (step === 4) {
    return null;
  }
  // Step 5: Contrato — distingue com valor vs só comissão (igual ao Step 1)
  else if (step === 5) {
    const key = hasValue ? 'STEP_5_CONTRACT_WITH_VALUE' : 'STEP_5_CONTRACT_NO_VALUE';
    template = await prisma.emailTemplate.findUnique({ where: { key } });
  }
  // Step 7: Encomenda enviada (NÓS inserimos tracking)
  else if (step === 7) {
    template = await prisma.emailTemplate.findUnique({ where: { key: 'STEP_7_SHIPPED' } });
  }

  // Fallback: qualquer template ativo para este step
  if (!template) {
    template = await prisma.emailTemplate.findFirst({
      where: { step, isActive: true },
    });
  }

  if (template) {
    logger.info(`[EMAIL] Found template: ${template.key} for step ${step}`);
  } else {
    logger.warn(`[EMAIL] No template found for step ${step}`);
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
