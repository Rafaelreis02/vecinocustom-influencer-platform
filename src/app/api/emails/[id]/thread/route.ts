import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGmailAuth, getThread } from '@/lib/gmail';

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

    // Buscar o email atual na nossa BD
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

    // Se não temos threadId, retornar só o email atual
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

    // Buscar thread completa do Gmail API
    console.log('[thread API] Fetching from Gmail API, threadId:', email.gmailThreadId);
    
    let thread;
    try {
      const auth = await getGmailAuth();
      thread = await getThread(auth, email.gmailThreadId);
      console.log(`[thread API] Gmail returned ${thread.messages.length} messages`);
    } catch (gmailError: any) {
      console.error('[thread API] Gmail API failed:', gmailError.message);
      
      // Se for erro de permissão/scope, informar claramente
      if (gmailError.message?.includes('insufficient permissions') || 
          gmailError.message?.includes('Forbidden') ||
          gmailError.message?.includes('scope')) {
        return NextResponse.json({
          success: false,
          error: 'Gmail permission error',
          message: 'Need to regenerate OAuth token with gmail.readonly scope',
          fallback: [{
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
        }, { status: 403 });
      }
      
      // Outros erros - usar fallback
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

    // Converter para o formato esperado pelo frontend
    // O Gmail já devolve na ordem cronológica
    const messages = thread.messages.map((msg: any, index: number) => {
      // Verificar se é email nosso (enviado por nós)
      const gmailUser = process.env.GMAIL_USER?.toLowerCase() || '';
      const isFromMe = msg.from.toLowerCase().includes('vecino') ||
                       msg.from.toLowerCase().includes(gmailUser);
      
      return {
        id: msg.id || `${email.id}-${index}`,
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        body: msg.body,
        htmlBody: msg.htmlBody,
        receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
        isSent: isFromMe,
        influencer: isFromMe ? null : email.influencer,
        senderName: isFromMe 
          ? 'Vecino Custom' 
          : (email.influencer?.name || msg.from.split('<')[0].trim()),
      };
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching email thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email thread' },
      { status: 500 }
    );
  }
}
