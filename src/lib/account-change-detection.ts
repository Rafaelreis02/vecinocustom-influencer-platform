/**
 * src/lib/account-change-detection.ts
 * 
 * Detecta mudanças de conta (Shopify, Gmail, etc)
 * E reconfigurar webhooks automaticamente
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { migrateWebhooksOnEmailChange } from './webhook-manager';

interface AccountChange {
  platform: 'SHOPIFY' | 'GMAIL';
  oldValue: string;
  newValue: string;
  type: 'DOMAIN' | 'EMAIL' | 'ACCOUNT_ID';
  changedAt: Date;
}

/**
 * Guardar mudança de conta no histórico
 */
export async function recordAccountChange(
  change: AccountChange
): Promise<void> {
  try {
    await prisma.accountChangeLog.create({
      data: {
        platform: change.platform,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changeType: change.type,
        changedAt: change.changedAt,
      },
    });

    logger.info('[Account Change] Recorded', change);
  } catch (error) {
    logger.error('[Account Change] Error recording', { error, ...change });
  }
}

/**
 * Detectar mudança de conta Shopify
 * Comparar store URL antigo vs novo
 */
export async function handleShopifyAccountChange(
  oldShopDomain: string,
  newShopDomain: string
): Promise<{
  success: boolean;
  webhooksUpdated: number;
  message: string;
}> {
  try {
    if (oldShopDomain === newShopDomain) {
      return { success: true, webhooksUpdated: 0, message: 'Mesmo Shopify, nenhuma mudança' };
    }

    logger.info('[Shopify Account Change] Detected', { oldShopDomain, newShopDomain });

    // 1. Encontrar webhooks do Shopify antigo
    const oldWebhooks = await prisma.webhookConfig.findMany({
      where: {
        platform: 'SHOPIFY',
        config: {
          contains: oldShopDomain, // JSON contains search
        },
      },
    });

    if (oldWebhooks.length === 0) {
      logger.info('[Shopify Account Change] No webhooks found for old shop', { oldShopDomain });
      return { success: true, webhooksUpdated: 0, message: 'Nenhum webhook anterior para migrar' };
    }

    // 2. Desativar webhooks antigos
    await Promise.all(
      oldWebhooks.map(webhook =>
        prisma.webhookConfig.update({
          where: { id: webhook.id },
          data: { isActive: false },
        })
      )
    );

    // 3. Criar novos webhooks para novo Shopify
    const newWebhooks = await Promise.all(
      oldWebhooks.map(webhook =>
        prisma.webhookConfig.create({
          data: {
            platform: 'SHOPIFY',
            email: webhook.email,
            webhookUrl: webhook.webhookUrl, // Mesmo URL (funciona para ambos)
            isActive: true,
            config: JSON.stringify({
              ...JSON.parse(webhook.config || '{}'),
              shopDomain: newShopDomain,
              migratedFrom: oldShopDomain,
            }),
          },
        })
      )
    );

    // 4. Registar mudança
    await recordAccountChange({
      platform: 'SHOPIFY',
      oldValue: oldShopDomain,
      newValue: newShopDomain,
      type: 'ACCOUNT_ID',
      changedAt: new Date(),
    });

    logger.info('[Shopify Account Change] Webhooks migrated', {
      oldShopDomain,
      newShopDomain,
      count: newWebhooks.length,
    });

    return {
      success: true,
      webhooksUpdated: newWebhooks.length,
      message: `Webhooks migrados de ${oldShopDomain} para ${newShopDomain}`,
    };

  } catch (error) {
    logger.error('[Shopify Account Change] Error handling account change', { error });
    throw error;
  }
}

/**
 * Detectar mudança de email (Gmail)
 * Já implementado em webhook-manager.ts, mas adiciona detecção de mudança
 */
export async function handleEmailAccountChange(
  oldEmail: string,
  newEmail: string
): Promise<{
  success: boolean;
  webhooksUpdated: number;
  message: string;
}> {
  try {
    if (oldEmail === newEmail) {
      return { success: true, webhooksUpdated: 0, message: 'Mesmo email, nenhuma mudança' };
    }

    logger.info('[Email Account Change] Detected', { oldEmail, newEmail });

    // Usar função existente de migração
    const result = await migrateWebhooksOnEmailChange(oldEmail, newEmail);

    // Registar mudança
    await recordAccountChange({
      platform: 'GMAIL',
      oldValue: oldEmail,
      newValue: newEmail,
      type: 'EMAIL',
      changedAt: new Date(),
    });

    const webhookCount = await prisma.webhookConfig.count({
      where: { email: newEmail, isActive: true },
    });

    return {
      success: result.success,
      webhooksUpdated: webhookCount,
      message: result.message,
    };

  } catch (error) {
    logger.error('[Email Account Change] Error handling account change', { error });
    throw error;
  }
}

/**
 * Verificar alterações na autenticação Shopify
 * Detecta se shop domain mudou
 */
export async function checkShopifyAuthChanges(): Promise<{
  changed: boolean;
  oldShop?: string;
  newShop?: string;
}> {
  try {
    const currentAuth = await prisma.shopifyAuth.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!currentAuth) {
      return { changed: false };
    }

    const expectedShop = process.env.SHOPIFY_SHOP_DOMAIN;

    if (currentAuth.shop !== expectedShop) {
      logger.warn('[Shopify Auth Check] Shop domain mismatch detected', {
        storedShop: currentAuth.shop,
        expectedShop,
      });

      return {
        changed: true,
        oldShop: currentAuth.shop,
        newShop: expectedShop,
      };
    }

    return { changed: false };

  } catch (error) {
    logger.error('[Shopify Auth Check] Error', { error });
    return { changed: false };
  }
}

/**
 * Endpoint para detectar e reconfigurar mudanças
 * Chamado manualmente ou por cron job
 */
export async function autoDetectAndReconfigureAccounts(): Promise<{
  shopifyChanged: boolean;
  emailChanged: boolean;
  shopifyWebhooksUpdated: number;
  emailWebhooksUpdated: number;
  summary: string;
}> {
  try {
    const result = {
      shopifyChanged: false,
      emailChanged: false,
      shopifyWebhooksUpdated: 0,
      emailWebhooksUpdated: 0,
      summary: '',
    };

    // 1. Verificar mudança de Shopify
    const shopifyCheck = await checkShopifyAuthChanges();
    if (shopifyCheck.changed && shopifyCheck.oldShop && shopifyCheck.newShop) {
      result.shopifyChanged = true;
      const shopifyResult = await handleShopifyAccountChange(
        shopifyCheck.oldShop,
        shopifyCheck.newShop
      );
      result.shopifyWebhooksUpdated = shopifyResult.webhooksUpdated;
    }

    // 2. Verificar mudança de email (opcional - requer comparação manual)
    // TODO: Implementar detecção automática de mudança de email

    // Criar resumo
    const messages = [];
    if (result.shopifyChanged) {
      messages.push(
        `Shopify: ${result.shopifyWebhooksUpdated} webhooks atualizados`
      );
    }
    if (result.emailChanged) {
      messages.push(
        `Email: ${result.emailWebhooksUpdated} webhooks atualizados`
      );
    }

    result.summary = messages.length > 0
      ? messages.join(', ')
      : 'Nenhuma mudança de conta detectada';

    logger.info('[Auto Detect] Complete', result);
    return result;

  } catch (error) {
    logger.error('[Auto Detect] Error', { error });
    throw error;
  }
}

/**
 * Obter histórico de mudanças de conta
 */
export async function getAccountChangeHistory(
  platform?: 'SHOPIFY' | 'GMAIL'
): Promise<any[]> {
  try {
    const where = platform ? { platform } : {};
    return await prisma.accountChangeLog.findMany({
      where,
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
  } catch (error) {
    logger.error('[Account Change History] Error', { error });
    return [];
  }
}
