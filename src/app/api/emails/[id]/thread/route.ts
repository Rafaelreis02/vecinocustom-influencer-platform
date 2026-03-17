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

      // Recursive function to extract body from nested MIME parts
      function extractParts(payload: any) {
        if (!payload) return;
        
        // Direct body data
        if (payload.body?.data) {
          const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          if (payload.mimeType === 'text/plain' && !body) {
            body = decoded;
          }
          if (payload.mimeType === 'text/html' && !htmlBody) {
            htmlBody = decoded;
          }
        }
        
        // Recurse into parts
        if (payload.parts) {
          for (const part of payload.parts) {
            extractParts(part);
          }
        }
      }
      
      extractParts(msg.payload);
      
      // === STRIP QUOTED REPLIES ===
      // Strategy: clean plain text aggressively, use it as primary content
      
      if (body) {
        // Find the FIRST occurrence of any quote marker and cut everything after
        const quoteMarkers = [
          // Email citation patterns (multi-language)
          /^.*<[^>]+@[^>]+>.*(?:escreveu|wrote|schrieb|a écrit|ha scritto|escribió|скрипт).*:?\s*$/im,
          // "On date, Name wrote:" / "Il giorno ... ha scritto:" / "El día..."  
          /^(?:On|Il giorno|Le|Am|El día|Em)[\s\S]{10,80}(?:wrote|ha scritto|a écrit|schrieb|escribió|escreveu).*:?\s*$/im,
          // Gmail: "---------- Forwarded message ----------"
          /^-{5,}\s*Forwarded message/im,
          // Separators
          /^-{3,}\s*$/m,
          /^_{3,}\s*$/m,
          // Outlook: "From: Name"
          /^From:\s+.+$/im,
          // "> " quoted lines (3+ consecutive)
          /(?:^>.*\n){3,}/m,
        ];
        
        let cutIndex = body.length;
        for (const pattern of quoteMarkers) {
          const match = body.search(pattern);
          if (match > 0 && match < cutIndex) {
            cutIndex = match;
          }
        }
        body = body.substring(0, cutIndex).trim();
        
        // Remove trailing ">" lines
        const lines = body.split('\n');
        while (lines.length > 0 && lines[lines.length - 1].trimStart().startsWith('>')) {
          lines.pop();
        }
        body = lines.join('\n').trim();
      }
      
      // For HTML: strip gmail_quote and everything after
      if (htmlBody) {
        htmlBody = htmlBody.replace(/<div class="gmail_quote"[\s\S]*$/i, '');
        htmlBody = htmlBody.replace(/<div id="appendonsend"[\s\S]*$/i, '');
        htmlBody = htmlBody.replace(/<blockquote[^>]*type="cite"[\s\S]*$/i, '');
        htmlBody = htmlBody.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '');
        htmlBody = htmlBody.replace(/(<br\s*\/?>|\s|<div>\s*<\/div>)+$/gi, '').trim();
      }
      
      // ALWAYS prefer clean plain text over HTML (more reliable quote stripping)
      // Convert plain text to simple HTML for consistent rendering
      const cleanContent = body 
        ? body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        : htmlBody;

      const isFromMe = isOurEmail(from);

      messages.push({
        id: msg.id,
        from,
        to,
        subject,
        body: cleanContent || body,
        htmlBody: cleanContent || htmlBody,
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
