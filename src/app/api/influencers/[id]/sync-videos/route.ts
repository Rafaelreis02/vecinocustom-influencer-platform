/**
 * POST /api/influencers/[id]/sync-videos
 * 
 * Endpoint manual para forçar sincronização de vídeos com influencer
 * Útil quando vídeos existiam antes do influencer ser criado
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';
import { linkVideosToInfluencer } from '@/lib/video-linker';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tiktokHandle: true,
        instagramHandle: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer não encontrado' },
        { status: 404 }
      );
    }

    // Linkar vídeos para cada plataforma
    const results = {
      tiktok: 0,
      instagram: 0,
      total: 0,
    };

    if (influencer.tiktokHandle) {
      results.tiktok = await linkVideosToInfluencer(
        influencer.id,
        influencer.tiktokHandle,
        'TIKTOK'
      );
    }

    if (influencer.instagramHandle) {
      results.instagram = await linkVideosToInfluencer(
        influencer.id,
        influencer.instagramHandle,
        'INSTAGRAM'
      );
    }

    results.total = results.tiktok + results.instagram;

    logger.info('[API] Manual video sync completed', {
      influencerId: id,
      influencerName: influencer.name,
      results,
    });

    return NextResponse.json(serializeBigInt({
      success: true,
      message: `${results.total} vídeos sincronizados`,
      influencer: influencer.name,
      results,
    }));

  } catch (error) {
    logger.error('[API] Error syncing videos', { error, influencerId: (await params).id });
    return handleApiError(error);
  }
}
