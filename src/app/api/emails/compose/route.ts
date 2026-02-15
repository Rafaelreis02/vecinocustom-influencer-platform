import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { google } from 'googleapis';

// POST /api/emails/compose - Send a new email
export async function POST(request: NextRequest) {
  try {
    const { to, subject, body } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Campos obrigatórios em falta' },
        { status: 400 }
      );
    }

    logger.info('[API] Send new email', { to, subject });

    // Get Gmail credentials from environment
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    let senderEmail = process.env.FROM_EMAIL;

    // Fallback email if FROM_EMAIL not set
    if (!senderEmail) {
      senderEmail = 'brand@vecinocustom.com';
      logger.warn('[API] FROM_EMAIL not configured, using fallback', { senderEmail });
    }

    logger.info('[API] Compose - Env check', {
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length || 0,
      senderEmail,
    });

    if (!refreshToken) {
      logger.error('[API] Gmail not configured - missing refresh token', {
        envKeys: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('GMAIL')),
      });
      return NextResponse.json(
        { 
          error: 'Gmail não configurado',
          message: 'Por favor, conecta o Gmail nas Definições (Settings) primeiro',
          action: 'redirect_to_settings'
        },
        { status: 400 }
      );
    }

    // Setup Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get sender name from request or use default
    const senderName = request.headers.get('x-sender-name') || 'Vecino Custom';

    // Create email message with sender name
    const email = [
      `From: ${senderName} <${senderEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    logger.info('[API] Email sent successfully', { to, subject });

    return NextResponse.json({
      success: true,
      message: 'Email enviado com sucesso',
    });
  } catch (error) {
    logger.error('[API] Error sending email', { error });
    return handleApiError(error);
  }
}
