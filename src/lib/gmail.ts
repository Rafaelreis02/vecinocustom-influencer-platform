/**
 * Gmail Integration Library
 * Syncs emails from brand@vecinocustom.com to the CRM
 */

import { google } from 'googleapis';
import { prisma } from './prisma';

// Initialize Gmail API
const gmail = google.gmail({
  version: 'v1',
});

// ============================================
// OAUTH2 SETUP (when credentials available)
// ============================================

export function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:3000/api/auth/gmail/callback
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

// ============================================
// FETCH EMAILS
// ============================================

export async function fetchEmails(auth: any, maxResults = 250) {
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      auth,
      q: 'is:unread', // Only unread emails (easier to sync)
      maxResults,
    });

    const messages = res.data.messages || [];
    
    // Fetch full message content for each
    const emailsData = await Promise.all(
      messages.map(msg => getMessageDetails(auth, msg.id!))
    );

    return {
      emails: emailsData,
    };
  } catch (error: any) {
    console.error('[GMAIL ERROR] Fetching emails:', error.message);
    throw error;
  }
}

// ============================================
// GET MESSAGE DETAILS
// ============================================

export async function getMessageDetails(auth: any, messageId: string) {
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      auth,
      format: 'full',
    });

    const message = res.data;
    const headers = message.payload?.headers || [];

    // Parse headers
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    // Get body
    let body = '';
    let htmlBody = '';

    if (message.payload?.parts) {
      // Multipart email
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain') {
          body = Buffer.from(part.body?.data || '', 'base64').toString();
        } else if (part.mimeType === 'text/html') {
          htmlBody = Buffer.from(part.body?.data || '', 'base64').toString();
        }
      }
    } else if (message.payload?.body?.data) {
      // Simple email
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    }

    // Get attachments
    const attachments: any[] = [];
    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.filename) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0,
            attachmentId: part.body?.attachmentId,
          });
        }
      }
    }

    return {
      gmailId: messageId,
      gmailThreadId: message.threadId,
      from: extractEmail(from),
      to: extractEmail(to),
      subject,
      body,
      htmlBody,
      attachments,
      receivedAt: new Date(date),
      labels: message.labelIds || [],
    };
  } catch (error: any) {
    console.error('[GMAIL ERROR] Getting message details:', error.message);
    throw error;
  }
}

// ============================================
// SYNC EMAILS TO DATABASE
// ============================================

export async function syncEmails(auth: any) {
  try {
    console.log('[GMAIL SYNC] Starting incremental email sync...');
    let totalSynced = 0;

    // 1. Encontrar a data do último email recebido na DB
    const lastEmail = await prisma.email.findFirst({
      orderBy: { receivedAt: 'desc' },
      select: { receivedAt: true }
    });

    // 2. Construir query de busca (só novos ou não lidos)
    let query = 'is:unread';
    if (lastEmail) {
      // Adicionar filtro de data (Gmail usa segundos Unix para after:)
      const afterTimestamp = Math.floor(lastEmail.receivedAt.getTime() / 1000);
      query = `after:${afterTimestamp}`;
    }

    // 3. Buscar lista de mensagens
    const res = await gmail.users.messages.list({
      userId: 'me',
      auth,
      q: query,
      maxResults: 250, // Carregar até 250 de uma vez
    });

    const messages = res.data.messages || [];
    console.log(`[GMAIL SYNC] Found ${messages.length} potential new messages.`);

    for (const msg of messages) {
      // Check if email already exists to avoid duplicates
      const existingEmail = await prisma.email.findFirst({
        where: { gmailId: msg.id! },
      });

      if (existingEmail) continue;

      // Fetch full message content
      const emailData = await getMessageDetails(auth, msg.id!);

      // Find influencer by email
      const influencer = await prisma.influencer.findFirst({
        where: { email: emailData.from },
      });

      await prisma.email.create({
        data: {
          gmailId: emailData.gmailId,
          gmailThreadId: emailData.gmailThreadId,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          htmlBody: emailData.htmlBody,
          attachments: emailData.attachments,
          receivedAt: emailData.receivedAt,
          labels: emailData.labels,
          influencerId: influencer?.id || null,
        },
      });

      totalSynced++;
      console.log(`[GMAIL SYNC] New email: ${emailData.subject}`);
    }

    console.log(`[GMAIL SYNC] Success! ${totalSynced} emails added.`);
    return totalSynced;
  } catch (error: any) {
    console.error('[GMAIL SYNC ERROR]', error.message);
    throw error;
  }
}

// ============================================
// HELPERS
// ============================================

function extractEmail(emailString: string): string {
  // Extract email from "Name <email@domain.com>" format
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

export async function markAsRead(auth: any, messageId: string) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      auth,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (error: any) {
    console.error('[GMAIL ERROR] Marking as read:', error.message);
  }
}

export async function markAsUnread(auth: any, messageId: string) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      auth,
      requestBody: {
        addLabelIds: ['UNREAD'],
      },
    });
  } catch (error: any) {
    console.error('[GMAIL ERROR] Marking as unread:', error.message);
  }
}

export async function sendEmail(auth: any, options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string; // Gmail message ID for threading
  threadId?: string;
}) {
  try {
    const message = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      `In-Reply-To: ${options.inReplyTo || ''}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      options.body
    ].join('\r\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      auth,
      requestBody: {
        raw: encodedMessage,
        threadId: options.threadId,
      },
    });

    return res.data;
  } catch (error: any) {
    console.error('[GMAIL ERROR] Sending email:', error.message);
    throw error;
  }
}
