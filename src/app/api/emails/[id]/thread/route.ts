import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseEmailThread } from '@/lib/email-parser';

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

    // Buscar o email atual
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Verificar se é email do sistema (enviado por nós)
    const isFromMe = email.from.toLowerCase().includes('vecino') ||
                     email.from.toLowerCase().includes('noreply') ||
                     email.from.toLowerCase().includes('system');

    // Analisar o conteúdo e separar em mensagens
    console.log('[thread API] Parsing email content...');
    const parsedMessages = parseEmailThread(
      email.htmlBody || email.body,
      !!email.htmlBody,
      email.from,
      isFromMe
    );
    console.log(`[thread API] Found ${parsedMessages.length} messages`);

    // Converter para o formato esperado pelo frontend
    const messages = parsedMessages.map((msg, index) => ({
      id: `${email.id}-${index}`,
      from: msg.isFromMe ? 'vecino@vecinocustom.com' : email.from,
      to: msg.isFromMe ? email.from : 'vecino@vecinocustom.com',
      subject: email.subject,
      body: msg.content,
      htmlBody: msg.content,
      receivedAt: email.receivedAt,
      isSent: msg.isFromMe,
      influencer: msg.isFromMe ? null : email.influencer,
      senderName: msg.senderName || (msg.isFromMe ? 'Vecino Custom' : email.influencer?.name || email.from.split('<')[0].trim()),
    }));

    return NextResponse.json({
      success: true,
      data: messages,
      debug: {
        originalContentLength: (email.htmlBody || email.body)?.length,
        messageCount: messages.length,
      }
    });
  } catch (error) {
    console.error('Error fetching email thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email thread' },
      { status: 500 }
    );
  }
}
