/**
 * Status Transition Email System
 * 
 * Sistema híbrido: Steps para estrutura, Status para emails
 * Cada transição de status pode disparar um email específico
 */

import { prisma } from './prisma';
import { sendWorkflowEmail } from './partnership-email';
import { logger } from './logger';

// Mapa de transições de status → emails a enviar
//
// REGRA DE OURO: email só é enviado quando NÓS avançamos um step manualmente.
// Ações feitas pelo influencer (aceitar proposta, preencher morada, assinar contrato)
// NÃO disparam email de confirmação para ele próprio.
//
// Transições que NÓS controlamos:
//   CONTACTED → ANALYZING         (nós criamos a parceria / enviamos proposta)
//   ANALYZING → COUNTER_PROPOSAL  (nós enviamos nova proposta)
//   PRODUCT_SELECTION → CONTRACT_PENDING (nós confirmamos produto e avançamos Step 3)
//   CONTRACT_SIGNED → SHIPPED     (nós inserimos tracking e avançamos Step 5/7)
//
// Transições que o INFLUENCER controla (sem email):
//   ANALYZING → AGREED            (influencer aceita proposta no portal)
//   AGREED → PRODUCT_SELECTION    (influencer preenche morada e sugestões)
//   CONTRACT_PENDING → CONTRACT_SIGNED (influencer assina contrato)
//
const STATUS_TRANSITION_EMAILS: Record<string, {
  step: number;
  description: string;
  requiresWorkflow: boolean;
}> = {
  // NÓS criamos parceria → Step 1 (proposta inicial)
  'CONTACTED→ANALYZING': {
    step: 1,
    description: 'Proposta inicial enviada pelo admin',
    requiresWorkflow: true,
  },

  // NÓS enviamos nova proposta → Step 1 (contraproposta - primeira vez)
  'ANALYZING→COUNTER_PROPOSAL': {
    step: 1,
    description: 'Nova proposta enviada pelo admin',
    requiresWorkflow: true,
  },

  // NÓS enviamos mais uma proposta → Step 1 (já em negociação, nova rodada)
  'COUNTER_PROPOSAL→COUNTER_PROPOSAL': {
    step: 1,
    description: 'Nova proposta enviada (re-negociação)',
    requiresWorkflow: true,
  },

  // NÓS confirmamos produto selecionado → Step 3 (peça em preparação)
  'PRODUCT_SELECTION→CONTRACT_PENDING': {
    step: 3,
    description: 'Produto confirmado, peça em preparação',
    requiresWorkflow: true,
  },

  // NÓS inserimos tracking → Step 7 (encomenda enviada)
  'CONTRACT_SIGNED→SHIPPED': {
    step: 7,
    description: 'Encomenda enviada com tracking',
    requiresWorkflow: true,
  },
};

interface SendStatusEmailResult {
  success: boolean;
  emailSent: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Envia email quando há transição de status do influencer
 * 
 * @param influencerId - ID do influencer
 * @param oldStatus - Status anterior
 * @param newStatus - Novo status
 * @param sentBy - Quem fez a alteração (userId ou 'system')
 * @returns Resultado do envio
 */
export async function sendStatusTransitionEmail(
  influencerId: string,
  oldStatus: string,
  newStatus: string,
  sentBy: string = 'system'
): Promise<SendStatusEmailResult> {
  const transitionKey = `${oldStatus}→${newStatus}`;
  const config = STATUS_TRANSITION_EMAILS[transitionKey];
  
  // Se não há config para esta transição, não faz nada
  if (!config) {
    logger.debug('[STATUS EMAIL] No email config for transition', {
      influencerId,
      transition: transitionKey,
    });
    return { success: true, emailSent: false };
  }
  
  logger.info('[STATUS EMAIL] Processing transition', {
    influencerId,
    transition: transitionKey,
    step: config.step,
    description: config.description,
  });
  
  try {
    // Buscar dados do influencer
    // Nota: couponCode e trackingUrl estão em PartnershipWorkflow, não em Influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: {
        id: true,
        name: true,
        email: true,
        instagramHandle: true,
        tiktokHandle: true,
        portalToken: true,
        shippingAddress: true,
        productSuggestion1: true,
        productSuggestion2: true,
        productSuggestion3: true,
        chosenProduct: true,
        trackingUrl: true,
      },
    });
    
    if (!influencer) {
      throw new Error(`Influencer ${influencerId} not found`);
    }
    
    if (!influencer.email) {
      logger.warn('[STATUS EMAIL] Influencer has no email', { influencerId });
      return {
        success: false,
        emailSent: false,
        error: 'Influencer has no email address',
      };
    }
    
    // Buscar workflow ativo (único fetch — usamos para workflowId e variáveis do template)
    const activeWorkflow = await prisma.partnershipWorkflow.findFirst({
      where: { influencerId, status: 'ACTIVE' as any },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        agreedPrice: true,
        couponCode: true,
        trackingUrl: true,
      },
    });

    let workflowId: string | undefined;
    if (config.requiresWorkflow) {
      if (!activeWorkflow) {
        logger.warn('[STATUS EMAIL] No active workflow found', {
          influencerId,
          transition: transitionKey,
        });
        return {
          success: false,
          emailSent: false,
          error: 'No active workflow found for this influencer',
        };
      }
      workflowId = activeWorkflow.id;
    }

    // Preparar variáveis para o template
    const variables = {
      nome: influencer.name,
      valor: activeWorkflow?.agreedPrice?.toString() || '0',
      email: influencer.email,
      instagram: influencer.instagramHandle || undefined,
      tiktok: influencer.tiktokHandle || undefined,
      morada: influencer.shippingAddress || undefined,
      sugestao1: influencer.productSuggestion1 || undefined,
      sugestao2: influencer.productSuggestion2 || undefined,
      sugestao3: influencer.productSuggestion3 || undefined,
      url_produto: influencer.chosenProduct || undefined,
      tracking_url: activeWorkflow?.trackingUrl || influencer.trackingUrl || undefined,
      cupom: activeWorkflow?.couponCode || undefined,
      portalToken: influencer.portalToken || undefined,
    };
    
    // Enviar email
    if (workflowId) {
      const result = await sendWorkflowEmail(
        workflowId,
        config.step,
        variables,
        sentBy
      );
      
      if (result.success) {
        logger.info('[STATUS EMAIL] Email sent successfully', {
          influencerId,
          transition: transitionKey,
          workflowId,
          emailId: result.emailId,
        });
        return {
          success: true,
          emailSent: true,
          emailId: result.emailId,
        };
      } else {
        logger.error('[STATUS EMAIL] Failed to send email', {
          influencerId,
          transition: transitionKey,
          error: result.error,
        });
        return {
          success: false,
          emailSent: false,
          error: result.error,
        };
      }
    }
    
    return { success: true, emailSent: false };
    
  } catch (error: any) {
    logger.error('[STATUS EMAIL] Unexpected error', {
      influencerId,
      transition: transitionKey,
      error: error.message,
    });
    return {
      success: false,
      emailSent: false,
      error: error.message,
    };
  }
}

/**
 * Atualiza status do influencer e envia email automaticamente
 * 
 * @param influencerId - ID do influencer
 * @param newStatus - Novo status
 * @param sentBy - Quem fez a alteração
 * @returns Resultado da atualização e do email
 */
export async function updateInfluencerStatus(
  influencerId: string,
  newStatus: string,
  sentBy: string = 'system'
): Promise<{
  success: boolean;
  oldStatus: string | null;
  newStatus: string;
  emailResult?: SendStatusEmailResult;
  error?: string;
}> {
  try {
    // Buscar status atual
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true, status: true },
    });
    
    if (!influencer) {
      return {
        success: false,
        oldStatus: null,
        newStatus,
        error: 'Influencer not found',
      };
    }
    
    const oldStatus = influencer.status;

    // Se o status não mudou, ainda pode haver email a enviar (ex: re-negociação COUNTER_PROPOSAL→COUNTER_PROPOSAL)
    // Só saltamos se não houver transição configurada para este par
    const transitionKey = `${oldStatus}→${newStatus}`;
    const hasSameStatusTransition = !!STATUS_TRANSITION_EMAILS[transitionKey];

    if (oldStatus === newStatus && !hasSameStatusTransition) {
      return {
        success: true,
        oldStatus,
        newStatus,
      };
    }

    // Atualizar status (cast para enum do Prisma) — só se realmente mudou
    if (oldStatus !== newStatus) {
      await prisma.influencer.update({
        where: { id: influencerId },
        data: { status: newStatus as any },
      });
    }
    
    logger.info('[STATUS UPDATE] Status changed', {
      influencerId,
      oldStatus,
      newStatus,
    });
    
    // Enviar email da transição
    const emailResult = await sendStatusTransitionEmail(
      influencerId,
      oldStatus,
      newStatus,
      sentBy
    );
    
    return {
      success: true,
      oldStatus,
      newStatus,
      emailResult,
    };
    
  } catch (error: any) {
    logger.error('[STATUS UPDATE] Error updating status', {
      influencerId,
      newStatus,
      error: error.message,
    });
    return {
      success: false,
      oldStatus: null,
      newStatus,
      error: error.message,
    };
  }
}

/**
 * Lista todas as transições configuradas
 */
export function getConfiguredTransitions(): Array<{
  from: string;
  to: string;
  step: number;
  description: string;
}> {
  return Object.entries(STATUS_TRANSITION_EMAILS).map(([key, config]) => {
    const [from, to] = key.split('→');
    return {
      from,
      to,
      step: config.step,
      description: config.description,
    };
  });
}
