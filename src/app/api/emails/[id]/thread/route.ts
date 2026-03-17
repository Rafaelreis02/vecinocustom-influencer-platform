import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

function extractEmail(str: string): string {
  const match = str.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : str.toLowerCase();
}

function isOurEmail(from: string): boolean {
  const email = extractEmail(from);
  const ourEmail = (process.env.GMAIL_USER || 'brand@vecinocustom.com').toLowerCase();
  return email.includes(ourEmail);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const email = await prisma.email.findUnique({
      where: { id },
      select: {
        id: true,
        gmailThreadId: true,
        from: true,
        to: true,
        subject: true,
        body: true,
        htmlBody: true,
        receivedAt: true,
        influencer: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (!email.gmailThreadId) {
      return NextResponse.json({
        success: true,
        data: [{
          id: email.id,
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          htmlBody: email.htmlBody,
          receivedAt: email.receivedAt,
          isSent: false,
          influencer: email.influencer,
          senderName: email.influencer?.name || email.from.split('<')[0].trim(),
        }],
      });
    }

    // Inline Gmail client - same pattern as sync-emails (which works!)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback'
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch thread from Gmail
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: email.gmailThreadId,
      format: 'full',
    });

    const gmailMessages = thread.data.messages || [];
    const messages = [];

    for (const msg of gmailMessages) {
      const headers = msg.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = msg.internalDate;

      let body = '';
      let htmlBody = '';

      if (msg.payload?.parts) {
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      } else if (msg.payload?.body?.data) {
        const decoded = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        if (msg.payload.mimeType === 'text/html') {
          htmlBody = decoded;
        } else {
          body = decoded;
        }
      }

      const isFromMe = isOurEmail(from);

      messages.push({
        id: msg.id,
        from,
        to,
        subject,
        body,
        htmlBody,
        receivedAt: date ? new Date(parseInt(date)).toISOString() : new Date().toISOString(),
        isSent: isFromMe,
        influencer: isFromMe ? null : email.influencer,
        senderName: isFromMe ? 'Vecino Custom' : (email.influencer?.name || from.split('<')[0].trim()),
      });
    }

    return NextResponse.json({
      success: true,
      data: messages,
    });

  } catch (error: any) {
    console.error('[thread API] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch thread', message: error.message },
      { status: 500 }
    );
  }
}
