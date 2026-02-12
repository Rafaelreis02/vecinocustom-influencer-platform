import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isRead } = await request.json();

    const email = await prisma.email.update({
      where: { id: params.id },
      data: { isRead },
    });

    return NextResponse.json(email);
  } catch (error) {
    logger.error('PATCH /api/emails/[id]/mark-read failed', error);
    return handleApiError(error);
  }
}
