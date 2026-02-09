/**
 * Email Reply Handler
 * 
 * POST /api/emails/[id]/reply
 * 
 * Sends a reply to an email via Gmail
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthClient, sendEmail } from '@/lib/gmail';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }

    // Get email details
    const email = await prisma.email.findUnique({
      where: { id: params.id },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Get Gmail auth client
    const auth = getAuthClient();

    // Send reply via Gmail
    await sendEmail(auth, {
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: text,
      inReplyTo: email.gmailId || '',
      threadId: email.gmailThreadId || '',
    });

    console.log(`[EMAIL REPLY] ✅ Replied to ${email.from}: ${email.subject}`);

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[EMAIL REPLY ERROR]', error.message);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send reply',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
