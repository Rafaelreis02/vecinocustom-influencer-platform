/**
 * Gmail Integration Library
 * Syncs emails from brand@vecinocustom.com to the CRM
 */

import { google } from 'googleapis';
import { prisma } from './prisma';

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
    console.log('[GMAIL SYNC] Starting incremental sync...');
    let totalSynced = 0;

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
    
    for (const msg of messages) {
      const exists = await prisma.email.findUnique({ where: { gmailId: msg.id! } });
      if (exists) continue;

      const emailData = await getMessageDetails(auth, msg.id!);
      const influencer = await prisma.influencer.findFirst({ where: { email: emailData.from } });

      await prisma.email.create({
        data: {
          ...emailData,
          influencerId: influencer?.id || null,
        },
      });
      totalSynced++;
    }

    console.log(`[GMAIL SYNC] Done. +${totalSynced} emails.`);
    return totalSynced;
  } catch (error: any) {
    console.error('[GMAIL SYNC ERROR]', error.message);
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
}) {
  const message = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `In-Reply-To: ${options.inReplyTo || ''}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    options.body
  ].join('\r\n');

  const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({
    userId: 'me',
    auth,
    requestBody: { raw, threadId: options.threadId },
  });
  return res.data;
}
