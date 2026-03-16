import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Buscar o email atual para obter o threadId
    const email = await prisma.email.findUnique({
      where: { id },
      select: { gmailThreadId: true, from: true, to: true },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

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
      const fromEmail = email.from;
      const toEmail = email.to;
      
      threadEmails = await prisma.email.findMany({
        where: {
          OR: [
            { from: fromEmail, to: toEmail },
            { from: toEmail, to: fromEmail },
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

    // Buscar também as respostas enviadas (replies) da nossa base de dados
    // Assumindo que as respostas são guardadas numa tabela separada ou com um flag
    // Por agora, vamos retornar só os emails recebidos

    return NextResponse.json({
      success: true,
      data: threadEmails,
    });
  } catch (error) {
    console.error('Error fetching email thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email thread' },
      { status: 500 }
    );
  }
}
