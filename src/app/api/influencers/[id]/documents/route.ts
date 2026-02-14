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
      orderBy: { uploadedAt: 'desc' },
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

    logger.info('[API] Upload request received', {
      influencerId: id,
      hasFile: !!file,
      fileSize: file?.size,
      fileName: file?.name,
      fileType: file?.type,
    });

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

    // Validate file type by extension as fallback
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension && !file.type) {
      return NextResponse.json(
        { error: 'Tipo de ficheiro não permitido (use PDF, Word, Excel, imagens ou ZIP)' },
        { status: 400 }
      );
    }

    // For now, store as base64 in database
    // In production, use R2/S3 and store URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Validate encoded size (PostgreSQL text field can handle ~1GB, but be safe)
    const encodedSize = Buffer.byteLength(dataUrl, 'utf8');
    if (encodedSize > 50 * 1024 * 1024) { // 50MB limit for base64
      return NextResponse.json(
        { error: 'Ficheiro demasiado grande quando codificado (máx. ~7.5MB)' },
        { status: 400 }
      );
    }

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
    logger.error('[API] Error uploading document', { 
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return handleApiError(error);
  }
}
