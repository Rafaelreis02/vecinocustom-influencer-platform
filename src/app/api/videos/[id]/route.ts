import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { cost } = await req.json();

    const video = await prisma.video.update({
      where: { id },
      data: { cost },
    });

    return NextResponse.json(video);
  } catch (error) {
    logger.error('PATCH /api/videos/[id] failed', error);
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/videos/[id] failed', error);
    return handleApiError(error);
  }
}
