import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/worker/analyze-hashtag - Extrai vídeos de hashtag com Claude Haiku
export async function POST(request: Request) {
  try {
    const { campaignId, hashtag, platform, snapshotText } = await request.json();

    if (!campaignId || !snapshotText) {
      return NextResponse.json(
        { error: 'Missing campaignId or snapshotText' },
        { status: 400 }
      );
    }

    // 1. Usar Claude Haiku para extrair vídeos
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analisa esta página de hashtag ${platform} e extrai informações dos vídeos:

SNAPSHOT:
${snapshotText}

Extrai APENAS vídeos que contenham a hashtag ${hashtag}.

Para cada vídeo encontrado, retorna JSON:
{
  "videos": [
    {
      "url": "URL completo do vídeo",
      "author": "username do criador",
      "title": "título/descrição (se disponível)",
      "views": número de views (se disponível, senão null),
      "likes": número de likes (se disponível, senão null)
    }
  ]
}

IMPORTANTE:
- Retorna APENAS JSON válido, sem explicações
- Se não encontrares vídeos, retorna {"videos": []}
- URLs devem estar completos (https://...)
- Números sem formatação (1000000, não "1M")`
        }
      ]
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Tentar extrair JSON de markdown code block
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Invalid JSON response from Claude');
      }
    }

    const videos = parsed.videos || [];
    
    if (videos.length === 0) {
      return NextResponse.json({
        newVideos: 0,
        skipped: 0,
        message: 'No videos found in snapshot'
      });
    }

    // 2. Para cada vídeo, verificar se já existe (por URL)
    let newCount = 0;
    let skippedCount = 0;

    for (const videoData of videos) {
      try {
        // Verificar se vídeo já existe
        const existing = await prisma.video.findFirst({
          where: { url: videoData.url }
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Procurar influencer pelo username
        let influencer = await prisma.influencer.findFirst({
          where: {
            OR: [
              { tiktokHandle: videoData.author },
              { instagramHandle: videoData.author },
              { name: videoData.author }
            ]
          }
        });

        // Se não existir, criar placeholder
        if (!influencer) {
          influencer = await prisma.influencer.create({
            data: {
              name: videoData.author,
              tiktokHandle: platform === 'TIKTOK' ? videoData.author : null,
              instagramHandle: platform === 'INSTAGRAM' ? videoData.author : null,
              status: 'suggestion',
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
            views: videoData.views || null,
            likes: videoData.likes || null,
            campaignId: campaignId,
            influencerId: influencer.id,
            publishedAt: new Date()
          }
        });

        newCount++;

      } catch (err: any) {
        console.error('[VIDEO CREATE ERROR]', err.message);
        // Continue processando os outros
      }
    }

    return NextResponse.json({
      newVideos: newCount,
      skipped: skippedCount,
      total: videos.length
    });

  } catch (err: any) {
    console.error('[ANALYZE HASHTAG ERROR]', err.message);
    return NextResponse.json(
      { error: 'Failed to analyze hashtag', details: err.message },
      { status: 500 }
    );
  }
}
