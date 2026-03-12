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
