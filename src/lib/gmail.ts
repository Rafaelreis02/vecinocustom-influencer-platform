import { google } from 'googleapis';
import { logger } from './logger';

// Gmail API configuration
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getSenderSettings() {
  return {
    senderEmail: process.env.GMAIL_USER || '',
    senderName: 'VecinoCustom',
  };
}

export async function getGmailAuth() {
  const { OAuth2 } = google.auth;
  
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

// Alias for backward compatibility
export const getAuthClient = getGmailAuth;

// Stub for syncEmails
export async function syncEmails(auth?: any) {
  logger.info('[GMAIL] syncEmails called');
  return 0;
}

export async function sendEmail(auth: any, options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
  fromName?: string;
}) {
  console.log('[GMAIL-DEBUG] ============================================');
  console.log('[GMAIL-DEBUG] sendEmail called');
  console.log('[GMAIL-DEBUG] to:', options.to);
  console.log('[GMAIL-DEBUG] subject:', options.subject);
  console.log('[GMAIL-DEBUG] body length:', options.body?.length);
  console.log('[GMAIL-DEBUG] body preview:', options.body?.substring(0, 100));

  if (!options.to) throw new Error('Missing recipient');
  if (!options.subject) throw new Error('Missing subject');
  if (!options.body) throw new Error('Missing body');

  const gmail = google.gmail({ version: 'v1', auth });
  
  const senderSettings = await getSenderSettings();
  const senderName = options.fromName || senderSettings.senderName;
  const senderEmail = senderSettings.senderEmail;
  
  // Build email message
  const messageParts = [
    `From: ${senderName} <${senderEmail}>`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    options.body
  ];

  const message = messageParts.filter(Boolean).join('\r\n');
  
  console.log('[GMAIL-DEBUG] Message:', message.substring(0, 300));

  // Encode to base64url
  const encodedMessage = Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: options.threadId,
      },
    });
    
    console.log('[GMAIL-DEBUG] SUCCESS! ID:', res.data.id);
    logger.info('[GMAIL] Email sent', { to: options.to, subject: options.subject });
    
    return res.data;
  } catch (error: any) {
    console.error('[GMAIL-DEBUG] FAILED:', error.message);
    throw error;
  }
}

/**
 * Busca uma thread completa do Gmail
 * Retorna cada mensagem separadamente (sem citações embutidas)
 */
export async function getThread(auth: any, threadId: string) {
  console.log('[GMAIL-DEBUG] getThread called:', threadId);
  
  const gmail = google.gmail({ version: 'v1', auth });
  
  try {
    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });
    
    const thread = res.data;
    const messages = thread.messages || [];
    
    console.log(`[GMAIL-DEBUG] Thread has ${messages.length} messages`);
    
    // Parsear cada mensagem
    const parsedMessages = messages.map((msg: any, index: number) => {
      const headers = msg.payload?.headers || [];
      
      // Extrair headers importantes
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
      
      // Extrair corpo da mensagem
      let body = '';
      let htmlBody = '';
      
      if (msg.payload?.parts) {
        // Mensagem multipart
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      } else if (msg.payload?.body?.data) {
        // Mensagem simples
        const data = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        if (msg.payload.mimeType === 'text/html') {
          htmlBody = data;
        } else {
          body = data;
        }
      }
      
      return {
        id: msg.id,
        threadId: msg.threadId,
        messageId,
        from,
        to,
        subject,
        date,
        body,
        htmlBody,
        internalDate: msg.internalDate,
        index,
      };
    });
    
    return {
      threadId: thread.id,
      historyId: thread.historyId,
      messages: parsedMessages,
    };
  } catch (error: any) {
    console.error('[GMAIL-DEBUG] getThread FAILED:', error.message);
    throw error;
  }
}
