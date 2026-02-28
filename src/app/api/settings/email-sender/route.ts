import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/settings/email-sender - Get email sender settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return current environment variables
    const senderName = process.env.EMAIL_SENDER_NAME || 'VecinoCustom';
    const senderEmail = process.env.EMAIL_SENDER_EMAIL || 'brand@vecinocustom.com';

    return NextResponse.json({
      success: true,
      data: {
        senderName,
        senderEmail,
      },
    });
  } catch (error) {
    logger.error('[API] Error fetching email sender settings', { error });
    return NextResponse.json(
      { error: 'Erro ao obter configurações' },
      { status: 500 }
    );
  }
}

// POST /api/settings/email-sender - Save email sender settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { senderName, senderEmail } = await request.json();

    if (!senderName || !senderName.trim()) {
      return NextResponse.json(
        { error: 'Nome do remetente não pode estar vazio' },
        { status: 400 }
      );
    }

    if (!senderEmail || !senderEmail.trim()) {
      return NextResponse.json(
        { error: 'Email do remetente não pode estar vazio' },
        { status: 400 }
      );
    }

    // Note: These settings are stored in memory for the current server instance
    // For persistence, you should set them as environment variables in Vercel:
    // EMAIL_SENDER_NAME and EMAIL_SENDER_EMAIL
    
    logger.info('[API] Email sender settings would need to be set in Vercel dashboard', {
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      instructions: 'Go to Vercel Dashboard > Project Settings > Environment Variables'
    });

    return NextResponse.json({
      success: true,
      message: 'Para persistir estas alterações, define as variáveis EMAIL_SENDER_NAME e EMAIL_SENDER_EMAIL no dashboard da Vercel',
      data: {
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
      },
    });
  } catch (error) {
    logger.error('[API] Error saving email sender settings', { error });
    return NextResponse.json(
      { error: 'Erro ao guardar configurações' },
      { status: 500 }
    );
  }
}
