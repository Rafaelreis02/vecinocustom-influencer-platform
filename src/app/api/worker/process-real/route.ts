import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  scrapeTikTokProfile,
  calculateEngagementRate,
  estimatePrice,
  determineTier,
  calculateFitScore
} from '@/lib/tiktok-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST: Processa influencer com dados REAIS do TikTok via Browser
 * Requer OpenClaw Gateway rodando localmente
 */
export async function POST() {
  try {
    // 1. Buscar próximo pendente
    const pending = await prisma.influencer.findFirst({
      where: { status: 'IMPORT_PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!pending) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nenhum influencer pendente' 
      });
    }

    console.log(`[WORKER-REAL] Processando: ${pending.name} (${pending.id})`);

    // 2. Extrair handle
    const handle = pending.tiktokHandle || pending.instagramHandle;
    const platform = pending.tiktokHandle ? 'TikTok' : 'Instagram';

    if (!handle) {
      await prisma.influencer.update({
        where: { id: pending.id },
        data: {
          status: 'SUGGESTION',
          notes: 'Erro: Nenhum handle fornecido.'
        }
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum handle fornecido' 
      });
    }

    if (platform !== 'TikTok') {
      // Instagram ainda não implementado
      await prisma.influencer.update({
        where: { id: pending.id },
        data: {
          status: 'SUGGESTION',
          notes: 'Instagram scraping não implementado ainda. Use TikTok.'
        }
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Apenas TikTok suportado no momento' 
      });
    }

    // 3. Scrape dados REAIS do TikTok via Browser
    console.log(`[WORKER-REAL] Abrindo browser para @${handle}...`);
    
    let profileData;
    try {
      // URL do OpenClaw Gateway (local)
      const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
      
      profileData = await scrapeTikTokProfile(handle, openclawUrl);
      console.log('[WORKER-REAL] Dados extraídos:', profileData);
      
    } catch (scrapeError: any) {
      console.error('[WORKER-REAL] Erro no scraping:', scrapeError.message);
      
      await prisma.influencer.update({
        where: { id: pending.id },
        data: {
          status: 'SUGGESTION',
          notes: `Erro ao extrair dados: ${scrapeError.message}. Verifique se OpenClaw Gateway está rodando.`
        }
      });
      
      return NextResponse.json({ 
        success: false, 
        error: scrapeError.message 
      });
    }

    // 4. Calcular métricas derivadas
    const engagementRate = calculateEngagementRate(
      profileData.totalLikes,
      profileData.followers
    );
    
    const estimatedPrice = estimatePrice(
      profileData.followers,
      engagementRate
    );
    
    const tier = determineTier(profileData.followers);
    
    const fitScore = calculateFitScore(
      profileData.bio,
      engagementRate,
      profileData.verified
    );
    
    // Average views dos vídeos recentes
    const avgViews = profileData.recentVideos.length > 0
      ? Math.round(
          profileData.recentVideos.reduce((sum, v) => sum + v.views, 0) / 
          profileData.recentVideos.length
        )
      : 0;
    
    const averageViewsStr = avgViews >= 1000000 ? `${(avgViews / 1000000).toFixed(1)}M`
                          : avgViews >= 1000 ? `${(avgViews / 1000).toFixed(1)}K`
                          : avgViews.toString();

    // 5. Atualizar influencer no DB
    const updateData: any = {
      status: 'SUGGESTION',
      notes: `✅ Dados REAIS extraídos via Browser em ${new Date().toLocaleString('pt-PT')}.\n\nBio: ${profileData.bio}`,
      name: profileData.name,
      tiktokFollowers: profileData.followers,
      totalLikes: BigInt(profileData.totalLikes),
      engagementRate,
      averageViews: averageViewsStr,
      contentStability: engagementRate >= 5 ? 'HIGH' : engagementRate >= 3 ? 'MEDIUM' : 'LOW',
      estimatedPrice,
      fitScore,
      tier,
      country: 'Portugal', // Assumir PT para TikTok .pt
      language: 'PT',
      primaryPlatform: 'TikTok'
    };
    
    if (profileData.email) {
      updateData.email = profileData.email;
    }
    
    // Tentar inferir nicho da bio
    const bioLower = profileData.bio.toLowerCase();
    if (bioLower.includes('fashion') || bioLower.includes('moda')) {
      updateData.niche = 'Fashion';
      updateData.contentTypes = ['Hauls', 'OOTD', 'Fashion Tips'];
    } else if (bioLower.includes('beauty') || bioLower.includes('beleza')) {
      updateData.niche = 'Beauty';
      updateData.contentTypes = ['Makeup', 'Skincare', 'Reviews'];
    } else if (bioLower.includes('lifestyle')) {
      updateData.niche = 'Lifestyle';
      updateData.contentTypes = ['Vlogs', 'Daily Life', 'Tips'];
    } else {
      updateData.niche = 'Lifestyle'; // Default
      updateData.contentTypes = ['Content'];
    }
    
    // Tags baseadas na bio
    const tags: string[] = [];
    if (profileData.bio.includes('portugal') || profileData.bio.includes('PT')) tags.push('portugal');
    if (profileData.verified) tags.push('verified');
    if (bioLower.includes('fashion')) tags.push('fashion');
    if (bioLower.includes('beauty')) tags.push('beauty');
    if (bioLower.includes('lifestyle')) tags.push('lifestyle');
    if (tags.length > 0) updateData.tags = tags;

    const updated = await prisma.influencer.update({
      where: { id: pending.id },
      data: updateData
    });

    console.log(`[WORKER-REAL] ✅ Processado: ${updated.name}`);
    console.log(`[WORKER-REAL] 📊 Followers: ${updated.tiktokFollowers} | Engagement: ${updated.engagementRate}% | Price: €${updated.estimatedPrice}`);

    // Converter BigInt para string para JSON
    const influencerData = JSON.parse(JSON.stringify(updated, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json({
      success: true,
      influencer: influencerData,
      source: 'browser-real',
      scrapedData: {
        followers: profileData.followers,
        totalLikes: profileData.totalLikes,
        engagementRate,
        averageViews: averageViewsStr,
        verified: profileData.verified
      }
    });

  } catch (error: any) {
    console.error('[WORKER-REAL] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
