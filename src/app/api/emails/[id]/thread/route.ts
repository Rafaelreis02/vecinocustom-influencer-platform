/**
 * Sistema de Chat de Emails Robusto
 * 
 * Combina:
 * 1. Emails recebidos do Gmail (via API)
 * 2. Emails enviados guardados na nossa BD
 * 
 * Assim temos histórico completo mesmo se a API falhar
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGmailAuth } from '@/lib/gmail';
import { google } from 'googleapis';

// Extrair email de strings tipo "Nome <email@domain.com>"
function extractEmail(str: string): string {
  const match = str.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : str.toLowerCase();
}

// Verificar se é email nosso
function isOurEmail(from: string): boolean {
  const email = extractEmail(from);
  const ourEmails = [
    process.env.GMAIL_USER?.toLowerCase() || '',
    'brand@vecinocustom.com',
    'vecino@vecinocustom.com',
    'noreply@vecinocustom.com',
  ];
  return ourEmails.some(e => email.includes(e));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Buscar email na nossa BD
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        influencer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        sentEmails: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const messages: any[] = [];

    // 2. Adicionar emails enviados (da nossa BD) - SEMPRE disponíveis
    if (email.sentEmails && email.sentEmails.length > 0) {
      for (const sent of email.sentEmails) {
        messages.push({
          id: `sent-${sent.id}`,
          from: process.env.GMAIL_USER || 'brand@vecinocustom.com',
          to: sent.toEmail,
          subject: sent.subject,
          body: sent.body,
          htmlBody: sent.htmlBody,
          receivedAt: sent.sentAt.toISOString(),
          isSent: true,
          source: 'database',
          senderName: 'Vecino Custom',
        });
      }
    }

    // 3. Tentar buscar do Gmail API (melhor opção se funcionar)
    if (email.gmailThreadId) {
      try {
        console.log('[thread API] Fetching from Gmail:', email.gmailThreadId);
        
        const auth = await getGmailAuth();
        const gmail = google.gmail({ version: 'v1', auth });
        
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: email.gmailThreadId,
          format: 'full',
        });

        const gmailMessages = thread.data.messages || [];
        console.log(`[thread API] Gmail returned ${gmailMessages.length} messages`);

        // Limpar mensagens da BD que já vêm do Gmail (evitar duplicados)
        const existingIds = new Set(messages.map(m => m.id));
        
        for (const msg of gmailMessages) {
          const msgId = msg.id;
          if (existingIds.has(msgId) || existingIds.has(`gmail-${msgId}`)) {
            continue;
          }

          // Extrair headers
          const headers = msg.payload?.headers || [];
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const to = headers.find((h: any) => h.name === 'To')?.value || '';
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const date = msg.internalDate;

          // Extrair body
          let body = '';
          let htmlBody = '';

          if (msg.payload?.parts) {
            for (const part of msg.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
              if (part.mimeType === 'text/html' && part.body?.data) {
                htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
            }
          } else if (msg.payload?.body?.data) {
            const data = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
            if (msg.payload.mimeType === 'text/html') {
              htmlBody = data;
            } else {
              body = data;
            }
          }

          const isFromMe = isOurEmail(from);

          messages.push({
            id: `gmail-${msgId}`,
            from,
            to,
            subject,
            body,
            htmlBody,
            receivedAt: new Date(parseInt(date)).toISOString(),
            isSent: isFromMe,
            source: 'gmail',
            senderName: isFromMe 
              ? 'Vecino Custom' 
              : (email.influencer?.name || from.split('<')[0].trim()),
          });
        }

      } catch (gmailError: any) {
        console.error('[thread API] Gmail API error:', gmailError.message);
        // Continua com os dados da BD (fallback)
      }
    }

    // 4. Ordenar por data (mais antigo primeiro)
    messages.sort((a, b) => 
      new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );

    // 5. Se não temos mensagens, retornar o email original
    if (messages.length === 0) {
      messages.push({
        id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        htmlBody: email.htmlBody,
        receivedAt: email.receivedAt,
        isSent: false,
        source: 'database',
        influencer: email.influencer,
        senderName: email.influencer?.name || email.from.split('<')[0].trim(),
      });
    }

    console.log(`[thread API] Returning ${messages.length} messages total`);

    return NextResponse.json({
      success: true,
      data: messages,
      meta: {
        total: messages.length,
        fromGmail: messages.filter(m => m.source === 'gmail').length,
        fromDatabase: messages.filter(m => m.source === 'database').length,
      },
    });

  } catch (error: any) {
    console.error('[thread API] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread', message: error.message },
      { status: 500 }
    );
  }
}
