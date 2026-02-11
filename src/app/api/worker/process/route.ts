import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: max 60s on hobby

// POST: Processa próximo influencer pendente com Claude
export async function POST() {
  try {
    // 1. Buscar próximo pendente (FIFO)
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

    console.log(`[WORKER] Processando influencer: ${pending.name} (${pending.id})`);

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

    // 3. Chamar Claude para analisar o perfil
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `Analisa este perfil de influencer ${platform} e extrai os seguintes dados:

Handle: @${handle}
Plataforma: ${platform}

Por favor, pesquisa informação pública sobre este perfil e retorna em formato JSON:

{
  "name": "Nome completo do influencer",
  "bio": "Biografia/descrição",
  "followers": número_de_seguidores,
  "totalLikes": número_total_de_likes (se disponível),
  "engagementRate": taxa_de_engagement_em_percentagem (estima se não tiveres dados exatos),
  "averageViews": "range de visualizações médias (ex: 10K-50K)",
  "contentStability": "HIGH|MEDIUM|LOW (consistência de performance)",
  "country": "País do influencer",
  "language": "PT|EN|ES|FR (idioma principal)",
  "niche": "Nicho principal (Fashion, Beauty, Lifestyle, etc)",
  "contentTypes": ["tipo1", "tipo2"] (ex: ["Hauls", "GRWM", "Reviews"]),
  "primaryPlatform": "${platform}",
  "tier": "nano|micro|macro|mega (baseado em followers)",
  "estimatedPrice": preço_estimado_em_euros_por_video,
  "fitScore": 1-5 (quão bem este perfil se adequa a joias de luxo portuguesas),
  "tags": ["tag1", "tag2", "tag3"],
  "email": "email se encontrares na bio, senão null"
}

IMPORTANTE:
- Se não conseguires aceder ao perfil ou não tiveres informação suficiente, retorna o que conseguires inferir e marca incertezas nas notes
- Para estimatedPrice: base na tier (nano: 50-100€, micro: 100-300€, macro: 300-1000€, mega: 1000€+)
- Para fitScore: considera alinhamento com joias, moda, lifestyle de luxo
- Se o perfil não existir ou estiver privado, retorna null para campos desconhecidos`;

    let analysis: any = {};
    let errorMessage = '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extrair JSON da resposta
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Claude não retornou JSON válido');
        }
      }

      console.log('[WORKER] Claude analysis:', analysis);

    } catch (aiError: any) {
      console.error('[WORKER] Claude API error:', aiError.message);
      errorMessage = `Erro na análise IA: ${aiError.message}`;
      
      // Fallback: dados básicos
      analysis = {
        name: pending.name,
        bio: 'Análise automática falhou',
        country: 'Portugal',
        language: 'PT',
        primaryPlatform: platform,
        tier: 'micro'
      };
    }

    // 4. Atualizar influencer no DB
    const updateData: any = {
      status: 'SUGGESTION', // Mover para sugestão
      notes: errorMessage || `Analisado automaticamente via IA. Bio: ${analysis.bio || 'N/A'}`,
    };

    // Atualizar apenas campos que Claude conseguiu preencher
    if (analysis.name && analysis.name !== pending.name) {
      updateData.name = analysis.name;
    }
    if (analysis.email) updateData.email = analysis.email;
    if (analysis.followers) {
      if (platform === 'TikTok') {
        updateData.tiktokFollowers = analysis.followers;
      } else {
        updateData.instagramFollowers = analysis.followers;
      }
    }
    if (analysis.totalLikes) updateData.totalLikes = BigInt(analysis.totalLikes);
    if (analysis.engagementRate) updateData.engagementRate = parseFloat(analysis.engagementRate);
    if (analysis.averageViews) updateData.averageViews = analysis.averageViews;
    if (analysis.contentStability) updateData.contentStability = analysis.contentStability;
    if (analysis.country) updateData.country = analysis.country;
    if (analysis.language) updateData.language = analysis.language;
    if (analysis.niche) updateData.niche = analysis.niche;
    if (analysis.contentTypes) updateData.contentTypes = analysis.contentTypes;
    if (analysis.primaryPlatform) updateData.primaryPlatform = analysis.primaryPlatform;
    if (analysis.tier) updateData.tier = analysis.tier;
    if (analysis.estimatedPrice) updateData.estimatedPrice = parseFloat(analysis.estimatedPrice);
    if (analysis.fitScore) updateData.fitScore = parseInt(analysis.fitScore);
    if (analysis.tags) updateData.tags = analysis.tags;

    const updated = await prisma.influencer.update({
      where: { id: pending.id },
      data: updateData
    });

    console.log(`[WORKER]  Influencer processado: ${updated.name}`);

    // Converter BigInt para string para JSON
    const influencerData = JSON.parse(JSON.stringify(updated, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json({
      success: true,
      influencer: influencerData,
      analysis
    });

  } catch (error: any) {
    console.error('[WORKER] Process error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
