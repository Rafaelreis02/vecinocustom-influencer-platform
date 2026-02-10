import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/worker/add-videos - Adiciona vídeos encontrados manualmente
export async function POST(request: Request) {
  try {
    const { campaignId, hashtag, platform, videos } = await request.json();

    if (!campaignId || !videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { error: 'Missing campaignId or videos' },
        { status: 400 }
      );
    }

    let newCount = 0;
    let skippedCount = 0;

    for (const videoData of videos) {
      try {
        // Verificar se já existe
        const existing = await prisma.video.findFirst({
          where: { url: videoData.url }
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Procurar ou criar influencer
        const author = videoData.author || 'unknown';
        let influencer = await prisma.influencer.findFirst({
          where: {
            OR: [
              { tiktokHandle: author },
              { instagramHandle: author }
            ]
          }
        });

        if (!influencer) {
          influencer = await prisma.influencer.create({
            data: {
              name: author,
              tiktokHandle: platform === 'TIKTOK' ? author : null,
              instagramHandle: platform === 'INSTAGRAM' ? author : null,
              status: 'SUGGESTION',
              tier: 'micro',
              primaryPlatform: platform,
              notes: `Auto-discovered via hashtag ${hashtag}`,
              createdById: 'cmlasiv0w0000dovsp7nnmgi0' // AI user ID
            }
          });
        }

        // Criar vídeo
        await prisma.video.create({
          data: {
            url: videoData.url,
            title: videoData.title || null,
            platform: platform as any,
            campaignId: campaignId,
            influencerId: influencer.id,
            publishedAt: new Date()
          }
        });

        newCount++;
      } catch (err: any) {
        console.error('[VIDEO CREATE ERROR]', err.message);
      }
    }

    return NextResponse.json({
      newVideos: newCount,
      skipped: skippedCount,
      total: videos.length
    });

  } catch (err: any) {
    console.error('[ADD VIDEOS ERROR]', err.message);
    return NextResponse.json(
      { error: 'Failed to add videos', details: err.message },
      { status: 500 }
    );
  }
}
