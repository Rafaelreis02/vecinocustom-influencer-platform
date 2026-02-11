/**
 * Email Compose Handler
 * 
 * POST /api/emails/compose
 * 
 * Sends a new email via Gmail
 */

import { NextResponse } from 'next/server';
import { getAuthClient, sendEmail } from '@/lib/gmail';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { to, subject, body } = await request.json();

    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      );
    }

    // Get Gmail auth client
    const auth = getAuthClient();

    // Send email via Gmail
    await sendEmail(auth, {
      to,
      subject,
      body,
    });

    logger.info(`Sent to ${to}: ${subject}`);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('POST /api/emails/compose failed', error);
    return handleApiError(error);
  }
}
