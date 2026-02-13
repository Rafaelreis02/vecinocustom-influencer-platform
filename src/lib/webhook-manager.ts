/**
 * src/lib/webhook-manager.ts
 * 
 * Gerenciador de webhooks automático
 * Quando email muda, reconfigurar tudo automaticamente
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { retryWithExponentialBackoff } from './retry';

interface WebhookConfig {
  platform: 'SHOPIFY' | 'GMAIL';
  email: string;
  webhookUrl: string;
  isActive: boolean;
  registeredAt?: Date;
  lastUpdated?: Date;
  config?: Record<string, any>;
}

/**
 * Guardar config de webhook na BD
 */
export async function saveWebhookConfig(
  platform: 'SHOPIFY' | 'GMAIL',
  email: string,
  webhookUrl: string,
  config?: Record<string, any>
): Promise<void> {
  try {
    // Verificar se já existe
    const existing = await prisma.webhookConfig.findUnique({
      where: {
        platform_email: {
          platform,
          email,
        },
      },
    });

    if (existing) {
      // Atualizar
      await prisma.webhookConfig.update({
        where: { id: existing.id },
        data: {
          webhookUrl,
          isActive: true,
          lastUpdated: new Date(),
          config: config ? JSON.stringify(config) : null,
        },
      });
      logger.info('[WebhookManager] Webhook config updated', { platform, email });
    } else {
      // Criar novo
      await prisma.webhookConfig.create({
        data: {
          platform,
          email,
          webhookUrl,
          isActive: true,
          config: config ? JSON.stringify(config) : null,
        },
      });
      logger.info('[WebhookManager] Webhook config created', { platform, email });
    }
  } catch (error) {
    logger.error('[WebhookManager] Error saving webhook config', { error, platform, email });
    throw error;
  }
}

/**
 * Obter todas as configs de webhook
 */
export async function getWebhookConfigs(
  platform?: 'SHOPIFY' | 'GMAIL'
): Promise<any[]> {
  try {
    const where = platform ? { platform } : {};
    return await prisma.webhookConfig.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
    });
  } catch (error) {
    logger.error('[WebhookManager] Error fetching webhook configs', { error });
    return [];
  }
}

/**
 * Quando admin muda email, migrar webhooks automaticamente
 */
export async function migrateWebhooksOnEmailChange(
  oldEmail: string,
  newEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('[WebhookManager] Starting webhook migration', { oldEmail, newEmail });

    // 1. Encontrar todas as configs do email antigo
    const oldConfigs = await prisma.webhookConfig.findMany({
      where: { email: oldEmail },
    });

    if (oldConfigs.length === 0) {
      logger.info('[WebhookManager] No webhooks found for old email', { oldEmail });
      return { success: true, message: 'Nenhum webhook para migrar' };
    }

    logger.info('[WebhookManager] Found webhooks to migrate', {
      oldEmail,
      count: oldConfigs.length,
    });

    // 2. Desativar webhooks antigos (não apagar!)
    await Promise.all(
      oldConfigs.map(config =>
        prisma.webhookConfig.update({
          where: { id: config.id },
          data: { isActive: false },
        })
      )
    );

    logger.info('[WebhookManager] Old webhooks disabled', { oldEmail });

    // 3. Criar novas configs com novo email
    const newConfigs = await Promise.all(
      oldConfigs.map(config =>
        retryWithExponentialBackoff(
          async () => {
            // Registar novo webhook no serviço (Shopify/Gmail)
            // await registerWebhookInService(config.platform, newEmail, ...);

            // Guardar config nova
            return await prisma.webhookConfig.create({
              data: {
                platform: config.platform,
                email: newEmail,
                webhookUrl: config.webhookUrl,
                isActive: true,
                config: config.config,
              },
            });
          },
          3,
          1000,
          `Migrating ${config.platform} webhook`
        )
      )
    );

    logger.info('[WebhookManager] New webhooks created', {
      newEmail,
      count: newConfigs.length,
    });

    // 4. Log de migração para auditoria
    await prisma.webhookMigrationLog.create({
      data: {
        oldEmail,
        newEmail,
        count: oldConfigs.length,
        status: 'SUCCESS',
      },
    });

    return {
      success: true,
      message: `${oldConfigs.length} webhooks migrados com sucesso para ${newEmail}`,
    };

  } catch (error) {
    logger.error('[WebhookManager] Error during webhook migration', {
      error,
      oldEmail,
      newEmail,
    });

    // Log de falha para auditoria
    await prisma.webhookMigrationLog.create({
      data: {
        oldEmail,
        newEmail,
        count: 0,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Desativar webhooks para um email
 */
export async function disableWebhooksForEmail(email: string): Promise<number> {
  try {
    const result = await prisma.webhookConfig.updateMany({
      where: { email },
      data: { isActive: false },
    });

    logger.info('[WebhookManager] Webhooks disabled', { email, count: result.count });
    return result.count;
  } catch (error) {
    logger.error('[WebhookManager] Error disabling webhooks', { error, email });
    return 0;
  }
}

/**
 * Verificar saúde dos webhooks
 */
export async function checkWebhooksHealth(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byPlatform: Record<string, number>;
}> {
  try {
    const configs = await prisma.webhookConfig.findMany();

    const byPlatform: Record<string, number> = {};
    let activeCount = 0;

    for (const config of configs) {
      byPlatform[config.platform] = (byPlatform[config.platform] || 0) + 1;
      if (config.isActive) activeCount++;
    }

    return {
      total: configs.length,
      active: activeCount,
      inactive: configs.length - activeCount,
      byPlatform,
    };
  } catch (error) {
    logger.error('[WebhookManager] Error checking webhook health', { error });
    return { total: 0, active: 0, inactive: 0, byPlatform: {} };
  }
}
