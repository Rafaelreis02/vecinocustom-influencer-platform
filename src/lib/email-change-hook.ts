/**
 * Hook para detectar mudança de email na sessão do user
 * 
 * Uso em /app/dashboard/settings/page.tsx:
 * useEffect(() => {
 *   if (session?.user?.email !== lastKnownEmail) {
 *     handleEmailChanged(lastKnownEmail, session.user.email);
 *   }
 * }, [session]);
 */

import { migrateWebhooksOnEmailChange } from './webhook-manager';
import { logger } from './logger';

/**
 * Detectar e processar mudança de email
 */
export async function handleEmailChange(
  oldEmail: string | undefined,
  newEmail: string | undefined
): Promise<boolean> {
  try {
    if (!oldEmail || !newEmail || oldEmail === newEmail) {
      return false;
    }

    logger.info('[Email Change Hook] Email changed', { oldEmail, newEmail });

    // Migrar webhooks automaticamente
    const result = await migrateWebhooksOnEmailChange(oldEmail, newEmail);

    if (result.success) {
      logger.info('[Email Change Hook] Webhooks migrated', { message: result.message });
      return true;
    } else {
      logger.warn('[Email Change Hook] Webhook migration had issues', { message: result.message });
      return false;
    }

  } catch (error) {
    logger.error('[Email Change Hook] Error handling email change', { error, oldEmail, newEmail });
    return false;
  }
}

/**
 * Limpar webhooks antigos após período
 * Chamar periodicamente (ex: cron job semanal)
 */
export async function cleanupOldWebhookConfigs(
  daysOld: number = 30
): Promise<number> {
  try {
    const { prisma } = await import('./prisma');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.webhookConfig.deleteMany({
      where: {
        isActive: false,
        lastUpdated: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('[Webhook Cleanup] Old configs deleted', {
      count: deleted.count,
      daysOld,
    });

    return deleted.count;

  } catch (error) {
    logger.error('[Webhook Cleanup] Error', { error });
    return 0;
  }
}
