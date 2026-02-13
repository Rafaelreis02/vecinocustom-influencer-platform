/**
 * POST /api/emails/setup-webhook
 * 
 * Configurar Gmail Push Notifications (Webhook)
 * Requer: Google Cloud Project + Gmail API + Service Account
 * 
 * Isto permite que Gmail nos notifique quando novos emails chegam
 * em vez de ter que fazer polling a cada X minutos
 * 
 * Flow:
 * 1. Admin chama este endpoint
 * 2. Gmail API registra webhook
 * 3. Sempre que novo email → POST para /api/webhooks/gmail
 * 4. Nosso código processa e sincroniza
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom-influencer-platform.vercel.app';
const GMAIL_WEBHOOK_URL = `${APP_URL}/api/webhooks/gmail`;

/**
 * Configurar Google API
 */
async function getGmailClient() {
  // TODO: Implementar com credenciais do Google
  // Por enquanto, retornar null para indicar que não está configurado
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (só admin pode fazer)
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Obter Gmail client
    const gmail = await getGmailClient();
    if (!gmail) {
      return NextResponse.json(
        { error: 'Gmail não configurado. Requer Google Cloud credentials.' },
        { status: 500 }
      );
    }

    logger.info('[Setup Webhook] Setting up Gmail push notifications', {
      webhookUrl: GMAIL_WEBHOOK_URL,
    });

    // Registrar webhook
    // Isto informa Gmail que queremos receber notificações em GMAIL_WEBHOOK_URL
    const watch = await (gmail as any).users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/your-project/topics/gmail-notifications`, // TODO: Configurar topic
        labelIds: ['INBOX'], // Apenas inbox
      },
    });

    logger.info('[Setup Webhook] Gmail webhook registered', {
      historyId: watch.data.historyId,
      expiration: watch.data.expiration,
    });

    return NextResponse.json({
      success: true,
      webhookUrl: GMAIL_WEBHOOK_URL,
      message: 'Gmail webhook configurado com sucesso',
      historyId: watch.data.historyId,
      expiration: watch.data.expiration,
    });

  } catch (error) {
    logger.error('[Setup Webhook] Error setting up Gmail webhook', { error });
    return NextResponse.json(
      { error: 'Erro ao configurar webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET - Verificar status do webhook
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // TODO: Verificar status do webhook no Google Cloud
    // Por enquanto, retornar status genérico

    return NextResponse.json({
      webhookConfigured: false,
      webhookUrl: GMAIL_WEBHOOK_URL,
      message: 'Webhook não está configurado. Execute POST para ativar.',
    });

  } catch (error) {
    logger.error('[Setup Webhook] Error checking webhook status', { error });
    return NextResponse.json(
      { error: 'Erro ao verificar webhook' },
      { status: 500 }
    );
  }
}
