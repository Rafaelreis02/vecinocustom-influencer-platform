/**
 * Email Compose Handler
 * 
 * POST /api/emails/compose
 * 
 * Sends a new email via Gmail
 */

import { NextResponse } from 'next/server';
import { getAuthClient, sendEmail } from '@/lib/gmail';

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

    console.log(`[EMAIL COMPOSE] Sent to ${to}: ${subject}`);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[EMAIL COMPOSE ERROR]', error.message);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send email',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
