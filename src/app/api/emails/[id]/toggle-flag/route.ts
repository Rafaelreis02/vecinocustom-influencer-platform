import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;
  try {
    // Fetch current email to toggle flag
    const email = await prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.email.update({
      where: { id },
      data: { isFlagged: !email.isFlagged },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('PATCH /api/emails/[id]/toggle-flag failed', error);
    return handleApiError(error);
  }
}
