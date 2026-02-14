import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { InfluencerUpdateSchema } from '@/lib/validation';
import { handleApiError, ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/influencers/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
        campaigns: {
          include: {
            campaign: true,
          },
        },
        coupons: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!influencer) {
      throw new ApiError(404, 'Influencer não encontrado');
    }

    // Calculate statistics
    const totalViews = influencer.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = influencer.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = influencer.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
    const totalShares = influencer.videos.reduce((sum, v) => sum + (v.shares || 0), 0);
    const totalRevenue = influencer.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);

    const enriched = {
      ...influencer,
      stats: {
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalRevenue,
        totalVideos: influencer.videos.length,
        activeCampaigns: influencer.campaigns.filter(c => c.campaign.status === 'ACTIVE').length,
        activeCoupons: influencer.coupons.filter(c => c.usageCount > 0).length,
      },
    };

    return NextResponse.json(serializeBigInt(enriched));
  } catch (error) {
    logger.error('GET /api/influencers/[id] failed', error);
    return handleApiError(error);
  }
}

// PATCH /api/influencers/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Converte o status para MAIÚSCULAS se ele existir, para bater com o ENUM da Base de Dados
    if (body.status && typeof body.status === 'string') {
      body.status = body.status.toUpperCase();
    }
    
    const validated = InfluencerUpdateSchema.parse(body);

    const influencer = await prisma.influencer.update({
      where: { id },
      data: validated,
    });

    logger.info('Influencer updated', { id });
    return NextResponse.json(serializeBigInt(influencer));
  } catch (error) {
    logger.error('PATCH /api/influencers/[id] failed', error);
    
    // Se for erro de validação Zod, retorna detalhes
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Dados inválidos', details },
        { status: 400 }
      );
    }
    
    return handleApiError(error);
  }
}

// Suporte para PUT (mudar status do influencer usa PUT no frontend)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context);
}

// DELETE /api/influencers/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.influencer.delete({
      where: { id },
    });

    logger.info('Influencer deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/influencers/[id] failed', error);
    return handleApiError(error);
  }
}
