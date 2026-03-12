/**
 * Status Update Utility
 *
 * Responsabilidade única: atualizar o status do influencer na DB.
 * NÃO envia emails — essa responsabilidade é dos endpoints de cada ação
 * (partnerships/create, send-counter, advance, design-messages).
 *
 * Todos os emails estão agora ligados diretamente ao botão/ação,
 * via sendWorkflowEmail em cada endpoint respetivo.
 */

import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Atualiza o status do influencer na base de dados.
 * Não envia emails — isso é feito em cada endpoint que o chama.
 */
export async function updateInfluencerStatus(
  influencerId: string,
  newStatus: string,
  updatedBy: string = 'system'
): Promise<{
  success: boolean;
  oldStatus: string | null;
  newStatus: string;
  error?: string;
}> {
  try {
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true, status: true },
    });

    if (!influencer) {
      return { success: false, oldStatus: null, newStatus, error: 'Influencer not found' };
    }

    const oldStatus = influencer.status;

    if (oldStatus === newStatus) {
      return { success: true, oldStatus, newStatus };
    }

    await prisma.influencer.update({
      where: { id: influencerId },
      data: { status: newStatus as any },
    });

    logger.info('[STATUS UPDATE] Status changed', { influencerId, oldStatus, newStatus, updatedBy });

    return { success: true, oldStatus, newStatus };
  } catch (error: any) {
    logger.error('[STATUS UPDATE] Error', { influencerId, newStatus, error: error.message });
    return { success: false, oldStatus: null, newStatus, error: error.message };
  }
}
