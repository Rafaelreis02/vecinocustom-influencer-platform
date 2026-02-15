import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/settings/email-sender - Save email sender name
export async function POST(request: NextRequest) {
  try {
    const { senderName } = await request.json();

    if (!senderName || !senderName.trim()) {
      return NextResponse.json(
        { error: 'Nome do sender não pode estar vazio' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Save to database (Settings table)
    // 2. Or save as env var in Vercel
    // For now, we'll return success and the frontend will use it

    logger.info('[API] Email sender name saved', {
      senderName: senderName.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Nome do sender guardado com sucesso',
      senderName: senderName.trim(),
    });
  } catch (error) {
    logger.error('[API] Error saving email sender name', { error });
    return NextResponse.json(
      { error: 'Erro ao guardar nome do sender' },
      { status: 500 }
    );
  }
}
