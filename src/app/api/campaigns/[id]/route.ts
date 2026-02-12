import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignUpdateSchema } from '@/lib/validation';
import { handleApiError, ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

// GET /api/campaigns/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        influencers: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
                tiktokHandle: true,
                tiktokFollowers: true,
              },
            },
          },
        },
        videos: {
          orderBy: { publishedAt: 'desc' },
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
      },
    });

    if (!campaign) {
      throw new ApiError(404, 'Campanha não encontrada');
    }

    // Calculate stats
    const totalViews = campaign.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = campaign.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const spent = campaign.videos.reduce((sum, v) => sum + (v.cost || 0), 0);
    
    // Count unique influencers (both registered influencers and unique authorHandles)
    const influencerIds = new Set(
      campaign.videos
        .filter((v): v is typeof v & { influencerId: string } => v.influencerId !== null)
        .map(v => v.influencerId)
    );
    const authorHandles = new Set(
      campaign.videos
        .filter((v): v is typeof v & { authorHandle: string } => !v.influencerId && v.authorHandle !== null)
        .map(v => v.authorHandle)
    );
    const influencersCount = influencerIds.size + authorHandles.size;

    return NextResponse.json({
      ...campaign,
      spent,
      totalViews,
      influencersCount,
      stats: {
        totalInfluencers: campaign.influencers.length,
        totalVideos: campaign.videos.length,
        totalViews,
        totalLikes,
      },
    });
  } catch (error) {
    logger.error('GET /api/campaigns/[id] failed', error);
    return handleApiError(error);
  }
}

// PATCH /api/campaigns/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Converte strings vazias para null para evitar erros de validação
    const cleanBody = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
    );
    
    const validated = CampaignUpdateSchema.parse(cleanBody);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...validated,
        status: (body.status as any) || undefined,
      },
    });

    logger.info('Campaign updated', { id });
    return NextResponse.json(campaign);
  } catch (error) {
    logger.error('PATCH /api/campaigns/[id] failed', error);
    return handleApiError(error);
  }
}

// Suporte para PUT (alguns componentes do frontend usam PUT em vez de PATCH)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context);
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.campaign.delete({
      where: { id },
    });

    logger.info('Campaign deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/campaigns/[id] failed', error);
    return handleApiError(error);
  }
}
