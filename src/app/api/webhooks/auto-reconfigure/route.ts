/**
 * POST /api/webhooks/auto-reconfigure
 * 
 * Detectar mudanças de conta e reconfigurar webhooks automaticamente
 * Pode ser chamado:
 * 1. Manualmente pelo admin: POST /api/webhooks/auto-reconfigure
 * 2. Automaticamente por cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  autoDetectAndReconfigureAccounts,
  getAccountChangeHistory,
} from '@/lib/account-change-detection';

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

    logger.info('[Auto Reconfigure] Starting account change detection');

    // Detectar e reconfigurar
    const result = await autoDetectAndReconfigureAccounts();

    logger.info('[Auto Reconfigure] Complete', result);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('[Auto Reconfigure] Error', { error });
    return NextResponse.json(
      { error: 'Erro ao reconfigurar webhooks' },
      { status: 500 }
    );
  }
}

/**
 * GET - Ver histórico de mudanças
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'SHOPIFY' | 'GMAIL' | null;

    const history = await getAccountChangeHistory(platform || undefined);

    return NextResponse.json({
      history,
      count: history.length,
      platform: platform || 'all',
    });

  } catch (error) {
    logger.error('[Auto Reconfigure] Error getting history', { error });
    return NextResponse.json(
      { error: 'Erro ao obter histórico' },
      { status: 500 }
    );
  }
}
