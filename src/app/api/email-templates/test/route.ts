import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthClient, sendEmail } from '@/lib/gmail';
import { logger } from '@/lib/logger';

/**
 * POST /api/email-templates/test
 * Send a test email with the provided subject and body
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Email de destino, assunto e corpo são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Email de destino inválido' },
        { status: 400 }
      );
    }

    const auth = getAuthClient();
    
    await sendEmail(auth, {
      to,
      subject: `[TESTE] ${subject}`,
      body: `${body}\n\n---\nEste é um email de teste enviado da plataforma VecinoCustom.`,
    });

    logger.info('[API] Test email sent', { to, subject: `[TESTE] ${subject}` });

    return NextResponse.json({
      success: true,
      message: 'Email de teste enviado com sucesso',
    });
  } catch (error: any) {
    logger.error('[API] Error sending test email', { error });
    return NextResponse.json(
      { error: 'Erro ao enviar email de teste: ' + error.message },
      { status: 500 }
    );
  }
}
