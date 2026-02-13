/**
 * Email Auto-Link Service
 * 
 * Automaticamente associa todos os emails do mesmo remetente a um influencer.
 * Relação 1:1 - Um email address <-> Um influencer
 */

import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Extrai o email limpo de uma string (remove "Nome <email>")
 */
export function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : from.trim().toLowerCase();
}

/**
 * Associa automaticamente todos os emails de um remetente a um influencer.
 * Chamado quando:
 * 1. Influencer é manualmente associado a um email
 * 2. Novo email chega e o remetente já tem influencer associado
 * 
 * Garante relação 1:1 - todos os emails do mesmo address vão para o mesmo influencer
 */
export async function autoLinkEmailsBySender(
  senderEmail: string,
  influencerId: string
): Promise<{ linked: number; alreadyLinked: number; errors: number }> {
  const cleanEmail = extractEmail(senderEmail);
  
  logger.info('[AUTO-LINK] Starting auto-link', { 
    senderEmail: cleanEmail, 
    influencerId 
  });

  let linked = 0;
  let alreadyLinked = 0;
  let errors = 0;

  try {
    // Verificar se o influencer existe
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true, email: true, name: true }
    });

    if (!influencer) {
      throw new Error(`Influencer ${influencerId} não encontrado`);
    }

    // Atualizar o email do influencer se estiver diferente ou vazio
    const currentInfluencerEmail = influencer.email ? extractEmail(influencer.email) : null;
    if (currentInfluencerEmail !== cleanEmail) {
      await prisma.influencer.update({
        where: { id: influencerId },
        data: { email: cleanEmail }
      });
      logger.info('[AUTO-LINK] Updated influencer email', { 
        influencerId, 
        oldEmail: influencer.email,
        newEmail: cleanEmail 
      });
    }

    // Buscar TODOS os emails deste remetente que NÃO estão associados a este influencer
    const emailsToLink = await prisma.email.findMany({
      where: {
        from: {
          contains: cleanEmail,
          mode: 'insensitive'
        },
        OR: [
          { influencerId: null },
          { influencerId: { not: influencerId } }
        ]
      },
      select: { id: true, influencerId: true, subject: true }
    });

    logger.info('[AUTO-LINK] Found emails to link', { 
      count: emailsToLink.length,
      senderEmail: cleanEmail 
    });

    // Se há emails já associados a OUTRO influencer, precisamos decidir o que fazer
    const emailsWithOtherInfluencer = emailsToLink.filter(e => e.influencerId !== null);
    
    if (emailsWithOtherInfluencer.length > 0) {
      logger.warn('[AUTO-LINK] Emails already linked to different influencer', {
        count: emailsWithOtherInfluencer.length,
        emails: emailsWithOtherInfluencer.map(e => ({ id: e.id, subject: e.subject }))
      });
    }

    // Atualizar todos os emails para apontar para o novo influencer
    for (const email of emailsToLink) {
      try {
        await prisma.email.update({
          where: { id: email.id },
          data: { influencerId: influencerId }
        });
        
        if (email.influencerId === null) {
          linked++;
        } else {
          alreadyLinked++;
        }
      } catch (error) {
        logger.error('[AUTO-LINK] Failed to link email', { emailId: email.id, error });
        errors++;
      }
    }

    logger.info('[AUTO-LINK] Completed', { 
      linked, 
      alreadyLinked, 
      errors,
      senderEmail: cleanEmail,
      influencerId
    });

    return { linked, alreadyLinked, errors };

  } catch (error) {
    logger.error('[AUTO-LINK] Fatal error', { error, senderEmail: cleanEmail, influencerId });
    throw error;
  }
}

/**
 * Busca o influencer associado a um email address.
 * Usado quando chega novo email para verificar se já existe associação.
 */
export async function findInfluencerBySenderEmail(
  senderEmail: string
): Promise<{ id: string; name: string } | null> {
  const cleanEmail = extractEmail(senderEmail);

  try {
    // Procurar influencer com este email
    const influencer = await prisma.influencer.findFirst({
      where: {
        email: {
          contains: cleanEmail,
          mode: 'insensitive'
        }
      },
      select: { id: true, name: true, email: true }
    });

    if (influencer) {
      logger.info('[AUTO-LINK] Found influencer by email', { 
        senderEmail: cleanEmail,
        influencerId: influencer.id,
        influencerName: influencer.name
      });
      return influencer;
    }

    // Se não encontrou diretamente, procurar algum email já associado a um influencer
    // que tenha este sender
    const linkedEmail = await prisma.email.findFirst({
      where: {
        from: {
          contains: cleanEmail,
          mode: 'insensitive'
        },
        influencerId: { not: null }
      },
      include: {
        influencer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (linkedEmail?.influencer) {
      logger.info('[AUTO-LINK] Found influencer by existing email link', {
        senderEmail: cleanEmail,
        influencerId: linkedEmail.influencer.id,
        influencerName: linkedEmail.influencer.name
      });
      return linkedEmail.influencer;
    }

    return null;

  } catch (error) {
    logger.error('[AUTO-LINK] Error finding influencer', { error, senderEmail: cleanEmail });
    return null;
  }
}

/**
 * Verifica e corrige inconsistências na base de dados.
 * Garante que todos os emails do mesmo remetente apontam para o mesmo influencer.
 */
export async function fixEmailInfluencerConsistency(): Promise<{
  fixed: number;
  conflicts: number;
  errors: number;
}> {
  logger.info('[AUTO-LINK] Starting consistency check');

  let fixed = 0;
  let conflicts = 0;
  let errors = 0;

  try {
    // Agrupar emails por remetente
    const emails = await prisma.email.findMany({
      where: { influencerId: { not: null } },
      select: { id: true, from: true, influencerId: true }
    });

    const senderMap = new Map<string, Map<string, number>>();

    for (const email of emails) {
      const cleanSender = extractEmail(email.from);
      
      if (!senderMap.has(cleanSender)) {
        senderMap.set(cleanSender, new Map());
      }
      
      const influencerCounts = senderMap.get(cleanSender)!;
      const count = influencerCounts.get(email.influencerId!) || 0;
      influencerCounts.set(email.influencerId!, count + 1);
    }

    // Verificar conflitos (mesmo remetente com influencers diferentes)
    for (const [sender, influencerCounts] of senderMap.entries()) {
      if (influencerCounts.size > 1) {
        conflicts++;
        logger.warn('[AUTO-LINK] Conflict detected', { 
          sender, 
          influencers: Array.from(influencerCounts.entries()) 
        });

        // Escolher o influencer com mais emails associados
        const [dominantInfluencerId] = Array.from(influencerCounts.entries())
          .sort((a, b) => b[1] - a[1])[0];

        // Corrigir todos os emails para apontar para o influencer dominante
        const emailsToFix = await prisma.email.findMany({
          where: {
            from: { contains: sender, mode: 'insensitive' },
            influencerId: { not: dominantInfluencerId }
          }
        });

        for (const email of emailsToFix) {
          try {
            await prisma.email.update({
              where: { id: email.id },
              data: { influencerId: dominantInfluencerId }
            });
            fixed++;
          } catch (error) {
            logger.error('[AUTO-LINK] Failed to fix email', { emailId: email.id, error });
            errors++;
          }
        }
      }
    }

    logger.info('[AUTO-LINK] Consistency check completed', { fixed, conflicts, errors });
    return { fixed, conflicts, errors };

  } catch (error) {
    logger.error('[AUTO-LINK] Consistency check failed', { error });
    throw error;
  }
}
