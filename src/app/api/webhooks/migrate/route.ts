/**
 * POST /api/webhooks/migrate
 * 
 * Endpoint para migrar webhooks quando email muda
 * Chamado automaticamente quando admin muda email
 * 
 * Uso:
 * POST /api/webhooks/migrate
 * Body: { oldEmail: "old@example.com", newEmail: "new@example.com" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { migrateWebhooksOnEmailChange, checkWebhooksHealth } from '@/lib/webhook-manager';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (só admin)
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { oldEmail, newEmail } = body;

    // Validar inputs
    if (!oldEmail || !newEmail) {
      return NextResponse.json(
        { error: 'oldEmail e newEmail são obrigatórios' },
        { status: 400 }
      );
    }

    if (oldEmail === newEmail) {
      return NextResponse.json(
        { error: 'Emails são iguais' },
        { status: 400 }
      );
    }

    logger.info('[Webhooks Migration] Starting', { oldEmail, newEmail });

    // Migrar webhooks
    const result = await migrateWebhooksOnEmailChange(oldEmail, newEmail);

    // Obter saúde dos webhooks após migração
    const health = await checkWebhooksHealth();

    logger.info('[Webhooks Migration] Completed', {
      oldEmail,
      newEmail,
      success: result.success,
      message: result.message,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      webhooksHealth: health,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('[Webhooks Migration] Error', { error });
    return NextResponse.json(
      { error: 'Erro ao migrar webhooks' },
      { status: 500 }
    );
  }
}

/**
 * GET - Verificar status de migração
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const health = await checkWebhooksHealth();

    return NextResponse.json({
      webhooksHealth: health,
      message: `${health.active} webhooks ativos, ${health.inactive} inativos`,
      byPlatform: health.byPlatform,
    });

  } catch (error) {
    logger.error('[Webhooks Status] Error', { error });
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}
