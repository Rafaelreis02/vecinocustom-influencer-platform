import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/auth/gmail/disconnect - Disconnect Gmail
export async function POST() {
  try {
    // In production, you would:
    // 1. Call Google revocation API
    // 2. Delete refresh token from database
    // 3. Log the disconnection

    logger.info('[API] Gmail disconnected manually');

    return NextResponse.json({
      success: true,
      message: 'Gmail desconectado. Remove GOOGLE_REFRESH_TOKEN do .env para completar.',
    });
  } catch (error) {
    logger.error('[API] Error disconnecting Gmail', { error });
    return NextResponse.json(
      { error: 'Erro ao desconectar Gmail' },
      { status: 500 }
    );
  }
}
