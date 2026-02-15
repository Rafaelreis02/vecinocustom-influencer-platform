import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// GET /api/auth/gmail/check - Check Gmail connection status
export async function GET() {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    let fromEmail = process.env.FROM_EMAIL;
    
    // Fallback email if FROM_EMAIL not set
    if (!fromEmail) {
      fromEmail = 'brand@vecinocustom.com';
    }
    
    logger.info('[API] Gmail check - Env vars', {
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length || 0,
      fromEmail: fromEmail,
    });

    if (!refreshToken) {
      logger.warn('[API] Gmail not configured - no refresh token');
      return NextResponse.json({
        connected: false,
        message: 'Gmail não configurado - falta GOOGLE_REFRESH_TOKEN',
      });
    }

    logger.info('[API] Gmail connection check - CONNECTED', { 
      refreshTokenLength: refreshToken.length,
      email: fromEmail 
    });

    return NextResponse.json({
      connected: true,
      email: fromEmail,
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
