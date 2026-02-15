import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Get Gmail credentials
    const gmailAuth = await prisma.gmailAuth.findFirst();
    if (!gmailAuth || !gmailAuth.accessToken) {
      return NextResponse.json(
        { error: 'Gmail não configurado' },
        { status: 400 }
      );
    }

    // Setup Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: gmailAuth.accessToken,
      refresh_token: gmailAuth.refreshToken || undefined,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const email = [
      `From: ${gmailAuth.email}`,
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
