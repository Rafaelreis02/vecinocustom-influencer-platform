import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/influencers/[id]/documents/[fileId] - Download document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;

    logger.info('[API] Download document request', { influencerId: id, fileId });

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.influencerId !== id) {
      logger.warn('[API] Document not found or unauthorized', { influencerId: id, fileId });
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    logger.info('[API] File found', { 
      fileId, 
      originalName: file.originalName,
      size: file.size,
      isDataUrl: file.url.startsWith('data:'),
    });

    // If it's a base64 data URL, extract and return as blob
    if (file.url.startsWith('data:')) {
      try {
        const [header, data] = file.url.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
        const buffer = Buffer.from(data, 'base64');

        logger.info('[API] Returning base64 file', { 
          fileId,
          bufferSize: buffer.length,
          mimeType,
        });

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': buffer.length.toString(),
          },
        });
      } catch (decodeError) {
        logger.error('[API] Error decoding base64', { fileId, error: decodeError });
        return NextResponse.json(
          { error: 'Erro a processar documento' },
          { status: 500 }
        );
      }
    }

    // Otherwise redirect to the URL (for S3/R2 files)
    logger.info('[API] Redirecting to external URL', { fileId, url: file.url.substring(0, 100) });
    return NextResponse.redirect(file.url);
  } catch (error) {
    logger.error('[API] Error downloading document', { error });
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
    logger.error('[API] Error deleting document', { error });
    return handleApiError(error);
  }
}
