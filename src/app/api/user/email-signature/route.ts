import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/user/email-signature - Get user's email signature
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would get the user from the request
    // For now, we'll get the first ADMIN user
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, emailSignature: true },
    });

    if (!user) {
      return NextResponse.json({
        signature: '',
        message: 'Sem assinatura configurada',
      });
    }

    logger.info('[API] Email signature fetched', {
      userId: user.id,
      hasSignature: !!user.emailSignature,
    });

    return NextResponse.json({
      signature: user.emailSignature || '',
    });
  } catch (error) {
    logger.error('[API] Error fetching email signature', { error });
    return handleApiError(error);
  }
}

// POST /api/user/email-signature - Save user's email signature
export async function POST(request: NextRequest) {
  try {
    const { signature } = await request.json();

    // In a real implementation, you would get the user from the request
    // For now, we'll update the first ADMIN user
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailSignature: signature || null },
      select: { id: true, emailSignature: true },
    });

    logger.info('[API] Email signature saved', {
      userId: user.id,
      signatureLength: signature?.length || 0,
    });

    return NextResponse.json({
      success: true,
      signature: updated.emailSignature || '',
      message: 'Assinatura guardada com sucesso',
    });
  } catch (error) {
    logger.error('[API] Error saving email signature', { error });
    return handleApiError(error);
  }
}
