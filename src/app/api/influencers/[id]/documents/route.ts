import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// GET /api/influencers/[id]/documents - List documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const files = await prisma.file.findMany({
      where: { influencerId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ files });
  } catch (error) {
    logger.error('[API] Error listing documents', { error });
    return handleApiError(error);
  }
}

// POST /api/influencers/[id]/documents - Upload document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer não encontrado' },
        { status: 404 }
      );
    }

    // Get file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum ficheiro fornecido' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ficheiro demasiado grande (máx. 10MB)` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de ficheiro não permitido' },
        { status: 400 }
      );
    }

    // For now, store as base64 in database
    // In production, use R2/S3 and store URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Create file record
    const fileRecord = await prisma.file.create({
      data: {
        filename: `${Date.now()}-${file.name}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: dataUrl, // In production, this would be R2/S3 URL
        type: 'DOCUMENT',
        influencerId: id,
      },
    });

    logger.info('[API] Document uploaded', {
      influencerId: id,
      filename: file.name,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      file: fileRecord,
    });
  } catch (error) {
    logger.error('[API] Error uploading document', { error });
    return handleApiError(error);
  }
}
