import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';

// GET /api/influencers/[id]/documents/[fileId] - Download document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.influencerId !== id) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // If it's a base64 data URL, extract and return as blob
    if (file.url.startsWith('data:')) {
      const [header, data] = file.url.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
      const buffer = Buffer.from(data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${file.originalName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Otherwise redirect to the URL (for S3/R2 files)
    return NextResponse.redirect(file.url);
  } catch (error) {
    return handleApiError(error);
  }
}

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
