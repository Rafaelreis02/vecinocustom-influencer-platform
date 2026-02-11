/**
 * Gmail Integration Library
 * Syncs emails from brand@vecinocustom.com to the CRM
 */

import { google, gmail_v1 } from 'googleapis';
import { prisma } from './prisma';

// Initialize Gmail API
const gmail = google.gmail({
  version: 'v1',
});

// Type for Gmail list response
interface GmailListResponse {
  data: {
    messages?: Array<{ id?: string | null; threadId?: string | null }>;
    nextPageToken?: string | null;
  };
}

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

export async function fetchEmails(auth: any, maxPages: number = 5) {
  try {
    const allEmails: any[] = [];
    let pageToken: string | undefined = undefined;

    for (let page = 0; page < maxPages; page++) {
      const res = await gmail.users.messages.list({
        userId: 'me',
        auth,
        q: 'is:unread',
        maxResults: 50,
        pageToken,
      }) as GmailListResponse;

      const messages = res.data.messages || [];
      
      // Fetch details for each message
      const emailsData = await Promise.all(
        messages.map((msg: any) => getMessageDetails(auth, msg.id!))
      );
      
      allEmails.push(...emailsData);

      if (!res.data.nextPageToken) break;
      pageToken = res.data.nextPageToken;
    }

    return {
      emails: allEmails,
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
    console.log('[GMAIL SYNC] Starting email sync...');
    let totalSynced = 0;

    // Fetch emails (first page only for now)
    const { emails } = await fetchEmails(auth);

    for (const emailData of emails) {
      // Find influencer by email
      const influencer = await prisma.influencer.findFirst({
        where: {
          email: emailData.from,
        },
      });

      // Check if email already exists
      const existingEmail = await prisma.email.findFirst({
        where: {
          gmailId: emailData.gmailId,
        },
      });

      if (!existingEmail) {
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
        console.log(`[GMAIL SYNC] Synced: ${emailData.subject} from ${emailData.from}`);
      }
    }

    console.log(`[GMAIL SYNC] Complete! Synced ${totalSynced} new emails.`);
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
  references?: string; // Reference header for threading
  threadId?: string;
}) {
  try {
    const headers = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
    ];

    if (options.inReplyTo) {
      headers.push(`In-Reply-To: <${options.inReplyTo}>`);
    }
    if (options.references) {
      headers.push(`References: <${options.references}>`);
    }

    headers.push('Content-Type: text/plain; charset=utf-8');

    const message = [...headers, '', options.body].join('\r\n');

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
