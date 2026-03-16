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

    // Buscar o email atual para obter o threadId
    const email = await prisma.email.findUnique({
      where: { id },
      select: { gmailThreadId: true, from: true, to: true },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Helper para extrair email de strings tipo "Nome <email@domain.com>"
    const extractEmail = (str: string): string => {
      const match = str.match(/<([^>]+)>/);
      return match ? match[1] : str;
    };

    // Se tem threadId, buscar todos os emails da mesma thread
    // Se não tem, buscar emails entre os mesmos remetentes
    let threadEmails;
    
    if (email.gmailThreadId) {
      threadEmails = await prisma.email.findMany({
        where: {
          gmailThreadId: email.gmailThreadId,
        },
        orderBy: { receivedAt: 'asc' },
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
    } else {
      // Fallback: buscar emails entre os mesmos remetentes
      // Extrair apenas o email address (sem o nome)
      const fromEmailClean = extractEmail(email.from);
      const toEmailClean = extractEmail(email.to);
      
      threadEmails = await prisma.email.findMany({
        where: {
          OR: [
            { 
              AND: [
                { from: { contains: fromEmailClean } },
                { to: { contains: toEmailClean } }
              ]
            },
            { 
              AND: [
                { from: { contains: toEmailClean } },
                { to: { contains: fromEmailClean } }
              ]
            },
          ],
        },
        orderBy: { receivedAt: 'asc' },
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
    }

    // Buscar também os emails enviados (respostas nossas)
    const sentEmails = await prisma.sentEmail.findMany({
      where: {
        emailId: { in: threadEmails.map((e: any) => e.id) },
      },
      orderBy: { sentAt: 'asc' },
    });

    // Combinar emails recebidos e enviados numa única lista
    const allMessages = [
      ...threadEmails.map((e: any) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        body: e.body,
        htmlBody: e.htmlBody,
        receivedAt: e.receivedAt,
        isSent: false,
        influencer: e.influencer,
      })),
      ...sentEmails.map((e: any) => ({
        id: e.id,
        from: 'vecino@vecinocustom.com', // Simular que é do nosso sistema
        to: e.toEmail,
        subject: e.subject,
        body: e.body,
        htmlBody: e.htmlBody,
        receivedAt: e.sentAt,
        isSent: true,
        influencer: null,
      })),
    ];

    // Ordenar por data
    allMessages.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    return NextResponse.json({
      success: true,
      data: allMessages,
    });
  } catch (error) {
    console.error('Error fetching email thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email thread' },
      { status: 500 }
    );
  }
}
