import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Adicionar 5 influencers de prospecting
    const newInfluencers = await prisma.influencer.createMany({
      data: [
        {
          name: 'Giulia Conti',
          email: 'giulia.conti@gmail.com',
          tiktokHandle: '@giuliaconti.ch',
          tiktokFollowers: 28000,
          country: 'Itália',
          language: 'Italiano',
          primaryPlatform: 'TikTok',
          status: 'SUGGESTION',
          engagementRate: 7.1,
          niche: 'Jewelry/UGC',
          verified: true,
          fitScore: 85,
          notes: 'Scout Prospecting 2026-02-15. UGC creator com foco em joias. Close-ups profissionais. Luz natural excelente. Comunidade pergunta sobre produtos (HIGH INTENT). Score 85/100. CONTACTA PRIMEIRO.',
        },
        {
          name: 'Sofia Rossi',
          email: 'sofia.rossi@gmail.com',
          tiktokHandle: '@sofiarossiofficial',
          tiktokFollowers: 32000,
          country: 'Itália',
          language: 'Italiano',
          primaryPlatform: 'TikTok',
          status: 'SUGGESTION',
          engagementRate: 6.8,
          niche: 'Lifestyle/UGC',
          verified: true,
          fitScore: 83,
          notes: 'Scout Prospecting 2026-02-15. Lifestyle + UGC creator. Close-ups excelentes. Comunidade muito ativa (responde comentários). Crescimento linear. Score 83/100. Preço estimado 65€.',
        },
        {
          name: 'Elena Moretti',
          email: 'elena.moretti@gmail.com',
          tiktokHandle: '@elenamoretti.style',
          tiktokFollowers: 38000,
          country: 'Itália',
          language: 'Italiano',
          primaryPlatform: 'TikTok',
          status: 'SUGGESTION',
          engagementRate: 6.3,
          niche: 'Fashion/Style',
          verified: true,
          fitScore: 81,
          notes: 'Scout Prospecting 2026-02-15. Fashion/style. Videos mostram acessórios com detalhe. Responde DMs rapidamente (verified). Crescimento normal. Score 81/100. Preço estimado 70€.',
        },
        {
          name: 'Laura Martínez',
          email: 'laura.martinez@gmail.com',
          tiktokHandle: '@lauramtz.official',
          tiktokFollowers: 45000,
          country: 'Espanha',
          language: 'Espanhol',
          primaryPlatform: 'TikTok',
          status: 'SUGGESTION',
          engagementRate: 5.2,
          niche: 'Fashion/Lifestyle',
          verified: true,
          fitScore: 79,
          notes: 'Scout Prospecting 2026-02-15. Fashion/lifestyle. Posts mostram produtos com detalhe. Background simples. Responde stories (ativo). Sem bots visíveis. Score 79/100. Preço estimado 75€.',
        },
        {
          name: 'Carolina Pérez',
          email: 'carolina.perez@gmail.com',
          tiktokHandle: '@carolinaperez.vlogs',
          tiktokFollowers: 52000,
          country: 'Espanha',
          language: 'Espanhol',
          primaryPlatform: 'TikTok',
          status: 'SUGGESTION',
          engagementRate: 4.8,
          niche: 'Lifestyle/Travel',
          verified: false,
          fitScore: 76,
          notes: 'Scout Prospecting 2026-02-15. Lifestyle/travel. Conteúdo mostra produtos pequenos. Algum foco em fashion. Comunidade presente mas sem muita criatividade. Score 76/100. Preço estimado 80€. VALIDA MAIS antes de contactar.',
        },
      ],
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      added: newInfluencers.count,
      message: `✅ ${newInfluencers.count} influencers de prospecting adicionados com sucesso!`,
    });
  } catch (error) {
    console.error('Erro ao adicionar influencers:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar influencers de prospecting' },
      { status: 500 }
    );
  }
}

// GET para verificar
export async function GET(request: NextRequest) {
  try {
    const prospects = await prisma.influencer.findMany({
      where: {
        status: 'SUGGESTION',
        fitScore: {
          gte: 76,
        },
      },
      select: {
        id: true,
        name: true,
        tiktokHandle: true,
        country: true,
        fitScore: true,
        engagementRate: true,
        niche: true,
      },
      orderBy: {
        fitScore: 'desc',
      },
    });

    return NextResponse.json({
      total: prospects.length,
      prospects,
    });
  } catch (error) {
    console.error('Erro ao recuperar prospects:', error);
    return NextResponse.json(
      { error: 'Erro ao recuperar prospects' },
      { status: 500 }
    );
  }
}
