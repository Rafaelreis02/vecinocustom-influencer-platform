/**
 * POST /api/webhooks/gmail
 * 
 * Webhook para Gmail Push Notifications
 * Quando um novo email chega, Gmail nos notifica e sincronizamos
 * 
 * Nota: Requer Google Cloud Project com Gmail API configurado
 * e setup de watch() no endpoint de emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { retryWithExponentialBackoff } from '@/lib/retry';

interface GmailNotification {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Decode base64 message from Gmail
 */
function decodeGmailMessage(data: string): {
  emailAddress: string;
  historyId: string;
} {
  const decoded = Buffer.from(data, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GmailNotification;

    logger.info('[Gmail Webhook] Received notification', {
      messageId: body.message.messageId,
      subscription: body.subscription,
    });

    // Verificar se é uma notificação válida
    if (!body.message || !body.message.data) {
      return NextResponse.json(
        { error: 'Invalid notification format' },
        { status: 400 }
      );
    }

    // Decodificar mensagem
    let gmailData;
    try {
      gmailData = decodeGmailMessage(body.message.data);
    } catch (error) {
      logger.error('[Gmail Webhook] Failed to decode message', { error });
      return NextResponse.json(
        { error: 'Failed to decode message' },
        { status: 400 }
      );
    }

    const { emailAddress, historyId } = gmailData;

    logger.info('[Gmail Webhook] Decoded notification', {
      emailAddress,
      historyId,
    });

    // TODO: Aqui seria necessário:
    // 1. Chamar Gmail API com historyId para obter novos emails
    // 2. Processar cada novo email
    // 3. Auto-linkar com influencer se necessário
    // 4. Guardar na BD

    // Por enquanto, apenas retornar sucesso (Gmail espera 2xx)
    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('[Gmail Webhook] Error processing notification', { error });
    // Gmail espera 2xx mesmo com erro (senão tenta reenviar)
    return NextResponse.json({ received: true });
  }
}
