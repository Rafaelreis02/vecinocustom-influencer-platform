/**
 * GET /api/webhooks/status
 * 
 * Verificar status de todos webhooks
 * Mostra qual está ativo e qual está offline
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface WebhookStatus {
  name: string;
  type: string;
  url: string;
  configured: boolean;
  lastEvent?: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom-influencer-platform.vercel.app';

    const webhooks: WebhookStatus[] = [
      {
        name: 'Shopify Orders',
        type: 'Shopify',
        url: `${baseUrl}/api/webhooks/shopify/orders`,
        configured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
        status: 'active',
        description: 'Calcula comissões em tempo real quando venda é feita',
      },
      {
        name: 'Gmail Notifications',
        type: 'Google Cloud',
        url: `${baseUrl}/api/webhooks/gmail`,
        configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        status: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'active' : 'inactive',
        description: 'Sincroniza emails em tempo real quando chegam novos',
      },
    ];

    // Adicionar endpoint de setup
    const setupEndpoints = [
      {
        name: 'Setup Shopify Webhooks',
        method: 'POST',
        url: `${baseUrl}/api/webhooks/shopify/setup`,
        description: 'Registar webhooks na Shopify',
      },
      {
        name: 'Setup Gmail Webhooks',
        method: 'POST',
        url: `${baseUrl}/api/emails/setup-webhook`,
        description: 'Ativar Gmail Push Notifications',
      },
    ];

    return NextResponse.json({
      webhooks,
      setupEndpoints,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('[Webhooks Status] Error', { error });
    return NextResponse.json(
      { error: 'Erro ao verificar webhooks' },
      { status: 500 }
    );
  }
}
