import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// GET /api/auth/gmail/check - Check Gmail connection status
export async function GET() {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
      return NextResponse.json({
        connected: false,
        message: 'Gmail não configurado',
      });
    }

    logger.info('[API] Gmail connection check', { connected: true });

    return NextResponse.json({
      connected: true,
      email: process.env.FROM_EMAIL,
      scopes: [
        'Ler emails',
        'Enviar emails',
        'Modificar labels',
      ],
    });
  } catch (error) {
    logger.error('[API] Error checking Gmail connection', { error });
    return NextResponse.json(
      { error: 'Erro ao verificar conexão' },
      { status: 500 }
    );
  }
}
