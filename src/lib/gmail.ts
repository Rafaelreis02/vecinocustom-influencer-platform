/**
 * Gmail Integration Library
 * Syncs emails from brand@vecinocustom.com to the CRM
 */

import { google } from 'googleapis';
import { prisma } from './prisma';
import { findInfluencerBySenderEmail, autoLinkEmailsBySender } from './email-auto-link';
import { logger } from './logger';

const gmail = google.gmail({ version: 'v1' });

export function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }
  return oauth2Client;
}

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

    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    let body = '';
    let htmlBody = '';

    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain') {
          body = Buffer.from(part.body?.data || '', 'base64').toString();
        } else if (part.mimeType === 'text/html') {
          htmlBody = Buffer.from(part.body?.data || '', 'base64').toString();
        } else if (part.parts) {
          for (const subPart of part.parts) {
            if (subPart.mimeType === 'text/plain') body = Buffer.from(subPart.body?.data || '', 'base64').toString();
            if (subPart.mimeType === 'text/html') htmlBody = Buffer.from(subPart.body?.data || '', 'base64').toString();
          }
        }
      }
    } else if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    }

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
    console.error('[GMAIL ERROR]', error.message);
    throw error;
  }
}

export async function syncEmails(auth: any) {
  try {
    logger.info('[GMAIL SYNC] Starting incremental sync...');
    let totalSynced = 0;
    let autoLinked = 0;

    const lastEmail = await prisma.email.findFirst({
      orderBy: { receivedAt: 'desc' },
      select: { receivedAt: true }
    });

    let query = 'label:INBOX';
    if (lastEmail) {
      const after = Math.floor(lastEmail.receivedAt.getTime() / 1000);
      query += ` after:${after}`;
    }

    const res = await gmail.users.messages.list({
      userId: 'me',
      auth,
      q: query,
      maxResults: 250, 
    });

    const messages = res.data.messages || [];
    
    // Track which senders we've auto-linked to avoid duplicate calls
    const processedSenders = new Set<string>();
    
    for (const msg of messages) {
      const exists = await prisma.email.findUnique({ where: { gmailId: msg.id! } });
      if (exists) continue;

      const emailData = await getMessageDetails(auth, msg.id!);
      
      // Tentar encontrar influencer pelo email do remetente
      let influencerId: string | null = null;
      const existingInfluencer = await findInfluencerBySenderEmail(emailData.from);
      
      if (existingInfluencer) {
        influencerId = existingInfluencer.id;
        
        // Auto-link todos os emails deste remetente (só uma vez por sender)
        if (!processedSenders.has(emailData.from)) {
          processedSenders.add(emailData.from);
          try {
            const linkResult = await autoLinkEmailsBySender(emailData.from, influencerId);
            autoLinked += linkResult.linked;
            logger.info('[GMAIL SYNC] Auto-linked emails for sender', {
              sender: emailData.from,
              influencerId,
              linked: linkResult.linked
            });
          } catch (autoLinkError) {
            logger.error('[GMAIL SYNC] Auto-link failed', { 
              sender: emailData.from, 
              error: autoLinkError 
            });
          }
        }
      }

      await prisma.email.create({
        data: {
          ...emailData,
          influencerId: influencerId,
        },
      });
      totalSynced++;
    }

    logger.info('[GMAIL SYNC] Completed', { 
      synced: totalSynced, 
      autoLinked,
      uniqueSenders: processedSenders.size 
    });
    
    return totalSynced;
  } catch (error: any) {
    logger.error('[GMAIL SYNC ERROR]', error);
    throw error;
  }
}

function extractEmail(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

export async function sendEmail(auth: any, options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
  fromName?: string;
}) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  // Use custom sender name or default
  const senderName = options.fromName || process.env.EMAIL_SENDER_NAME || 'VecinoCustom';
  const senderEmail = process.env.EMAIL_SENDER_EMAIL || 'brand@vecinocustom.com';
  
  // Build email content using Gmail API's format
  const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
  
  // Simple message structure - Gmail will use the authenticated user's email
  // but we can try to set a custom From name using the Reply-To or custom headers
  const messageParts = [
    `From: ${senderName} <${senderEmail}>`,
    `To: ${options.to}`,
    `Subject: ${utf8Subject}`,
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    options.body
  ];

  const message = messageParts.filter(Boolean).join('\n');

  // Encode to base64url (RFC 4648)
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: options.threadId,
    },
  });
  
  return res.data;
}
