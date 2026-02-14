import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';

// DELETE /api/influencers/[id]/documents/[fileId] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;

    // Verify file belongs to influencer
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.influencerId !== id) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Delete file
    await prisma.file.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
