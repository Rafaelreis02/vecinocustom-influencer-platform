import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch current email to toggle flag
    const email = await prisma.email.findUnique({
      where: { id: params.id },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.email.update({
      where: { id: params.id },
      data: { isFlagged: !email.isFlagged },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('PATCH /api/emails/[id]/toggle-flag failed', error);
    return handleApiError(error);
  }
}
