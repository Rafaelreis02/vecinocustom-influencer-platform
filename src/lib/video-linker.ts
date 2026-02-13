/**
 * Video-Influencer Linking Utilities
 * 
 * Funções para auto-linkar vídeos e influencers baseado no handle (@)
 */

import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Procura vídeos não linkados com este handle e associa ao influencer
 * Retorna número de vídeos linkados
 */
export async function linkVideosToInfluencer(
  influencerId: string,
  handle: string | null,
  platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE'
): Promise<number> {
  if (!handle) return 0;

  try {
    // Normalizar handle (remover @ se existir)
    const normalizedHandle = handle.replace(/^@/, '').toLowerCase();

    // Procurar vídeos não linkados com este authorHandle
    const videosToLink = await prisma.video.findMany({
      where: {
        influencerId: null, // Só vídeos não linkados
        platform: platform,
        OR: [
          { authorHandle: normalizedHandle },
          { authorHandle: handle }, // Com @
          { authorHandle: normalizedHandle.replace(/^@/, '') }, // Sem @
        ],
      },
      select: { id: true, authorHandle: true },
    });

    if (videosToLink.length === 0) return 0;

    // Linkar todos os vídeos encontrados
    const updatePromises = videosToLink.map(video =>
      prisma.video.update({
        where: { id: video.id },
        data: { influencerId },
      })
    );

    await Promise.all(updatePromises);

    logger.info('[VideoLinker] Videos linked to influencer', {
      influencerId,
      handle: normalizedHandle,
      count: videosToLink.length,
      videoIds: videosToLink.map(v => v.id),
    });

    return videosToLink.length;
  } catch (error) {
    logger.error('[VideoLinker] Error linking videos to influencer', { error, influencerId, handle });
    return 0;
  }
}

/**
 * Procura influencer com este handle e associa ao vídeo
 * Retorna true se conseguiu linkar
 */
export async function linkInfluencerToVideo(
  videoId: string,
  handle: string | null,
  platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE'
): Promise<boolean> {
  if (!handle) return false;

  try {
    // Normalizar handle
    const normalizedHandle = handle.replace(/^@/, '').toLowerCase();

    // Procurar influencer com este handle na plataforma correta
    let influencer = null;

    if (platform === 'TIKTOK') {
      influencer = await prisma.influencer.findFirst({
        where: {
          tiktokHandle: {
            in: [normalizedHandle, `@${normalizedHandle}`],
          },
        },
        select: { id: true },
      });
    } else if (platform === 'INSTAGRAM') {
      influencer = await prisma.influencer.findFirst({
        where: {
          instagramHandle: {
            in: [normalizedHandle, `@${normalizedHandle}`],
          },
        },
        select: { id: true },
      });
    }

    if (!influencer) return false;

    // Linkar vídeo ao influencer
    await prisma.video.update({
      where: { id: videoId },
      data: { influencerId: influencer.id },
    });

    logger.info('[VideoLinker] Video linked to influencer', {
      videoId,
      influencerId: influencer.id,
      handle: normalizedHandle,
    });

    return true;
  } catch (error) {
    logger.error('[VideoLinker] Error linking video to influencer', { error, videoId, handle });
    return false;
  }
}

/**
 * Re-link todos os vídeos de um influencer (útil quando handle muda)
 * Remove links antigos e cria novos
 */
export async function relinkAllInfluencerVideos(
  influencerId: string,
  oldHandle: string | null,
  newHandle: string | null,
  platform: 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE'
): Promise<{ unlinked: number; linked: number }> {
  try {
    // 1. Deslinkar vídeos do handle antigo (se existir)
    let unlinked = 0;
    if (oldHandle && oldHandle !== newHandle) {
      const oldNormalized = oldHandle.replace(/^@/, '').toLowerCase();
      
      const videosToUnlink = await prisma.video.findMany({
        where: {
          influencerId,
          platform,
          OR: [
            { authorHandle: oldNormalized },
            { authorHandle: oldHandle },
          ],
        },
        select: { id: true },
      });

      if (videosToUnlink.length > 0) {
        await prisma.video.updateMany({
          where: { id: { in: videosToUnlink.map(v => v.id) } },
          data: { influencerId: null },
        });
        unlinked = videosToUnlink.length;
      }
    }

    // 2. Linkar vídeos com novo handle
    const linked = await linkVideosToInfluencer(influencerId, newHandle, platform);

    logger.info('[VideoLinker] Relinked influencer videos', {
      influencerId,
      oldHandle,
      newHandle,
      unlinked,
      linked,
    });

    return { unlinked, linked };
  } catch (error) {
    logger.error('[VideoLinker] Error relinking videos', { error, influencerId, oldHandle, newHandle });
    return { unlinked: 0, linked: 0 };
  }
}
