import { google } from 'googleapis';
import { prisma } from './prisma';
import { logger } from './logger';

// Gmail API configuration
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getSenderSettings() {
  // Use environment variables directly
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

// Stub for syncEmails - implement if needed
export async function syncEmails(auth?: any) {
  logger.info('[GMAIL] syncEmails called - not implemented');
  return 0; // Return number of synced emails
}

export async function sendEmail(auth: any, options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
  fromName?: string;
}) {
  logger.info('[GMAIL] Attempting to send email', {
    to: options.to,
    subject: options.subject,
    bodyLength: options.body?.length || 0,
  });

  // Validate inputs
  if (!options.to) {
    throw new Error('Missing recipient email');
  }
  if (!options.subject) {
    throw new Error('Missing subject');
  }
  if (!options.body || options.body.trim() === '') {
    throw new Error('Missing or empty email body');
  }

  const gmail = google.gmail({ version: 'v1', auth });
  
  const senderSettings = await getSenderSettings();
  const senderName = options.fromName || senderSettings.senderName;
  const senderEmail = senderSettings.senderEmail;
  
  // Build simple email message
  const messageParts = [
    'Content-Type: text/plain; charset="utf-8"',
    'MIME-Version: 1.0',
    'Content-Transfer-Encoding: quoted-printable',
    `To: ${options.to}`,
    `From: ${senderName} <${senderEmail}>`,
    `Subject: ${options.subject}`,
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
    '',
    options.body
  ];

  const message = messageParts.filter(Boolean).join('\r\n');

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
    
    logger.info('[GMAIL] Email sent successfully', {
      to: options.to,
      subject: options.subject,
      messageId: res.data.id,
    });
    
    return res.data;
  } catch (error: any) {
    logger.error('[GMAIL] Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: error.message,
    });
    throw error;
  }
}
// Deploy fix Thu Mar 12 04:52:37 PM UTC 2026
