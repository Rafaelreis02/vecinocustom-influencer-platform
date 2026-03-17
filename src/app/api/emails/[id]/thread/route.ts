import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Buscar email e suas respostas enviadas
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        influencer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        sentEmails: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const messages: any[] = [];

    // Adicionar respostas enviadas (da nossa BD)
    for (const sent of email.sentEmails) {
      messages.push({
        id: `sent-${sent.id}`,
        from: process.env.GMAIL_USER || 'brand@vecinocustom.com',
        to: sent.toEmail,
        subject: sent.subject,
        body: sent.body,
        htmlBody: sent.htmlBody,
        receivedAt: sent.sentAt.toISOString(),
        isSent: true,
        senderName: 'Vecino Custom',
      });
    }

    // Adicionar email original (recebido)
    messages.push({
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
    });

    // Ordenar por data (mais antigo primeiro)
    messages.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    return NextResponse.json({
      success: true,
      data: messages,
    });

  } catch (error: any) {
    console.error('[thread API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread', message: error.message },
      { status: 500 }
    );
  }
}
