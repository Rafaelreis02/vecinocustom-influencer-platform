import { NextResponse } from 'next/server';
import { parseProfile } from '@/lib/apify-fetch';
import Anthropic from '@anthropic-ai/sdk';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// VECINO brand context for fit analysis
const VECINO_CONTEXT = `
VECINO é uma marca portuguesa de joias personalizadas de luxo acessível.
- Target: Mulheres 25-45 anos, classe média-alta
- Estética: Minimalista, elegante, atemporal
- Nichos ideais: Fashion, Lifestyle, Beauty, Luxury
- Valores: Autenticidade, qualidade, personalização
- Red flags: Conteúdo muito casual, humor excessivo, niches muito distantes (gaming, tech, fitness extremo)
`;

async function analyzeFit(profileData: any): Promise<{ fitScore: number; reasoning: string; niche: string; contentTypes: string[] }> {
  try {
    const prompt = `Analisa este perfil de influencer e determina o FIT para a marca VECINO (joias):

${VECINO_CONTEXT}

PERFIL DO INFLUENCER:
- Handle: @${profileData.handle}
- Seguidores: ${profileData.followers?.toLocaleString() || 'N/A'}
- Engagement Rate: ${profileData.engagementRate?.toFixed(2) || 'N/A'}%
- Bio: ${profileData.biography || 'N/A'}
- Verificado: ${profileData.verified ? 'Sim' : 'Não'}

TAREFA:
1. Identifica o NICHE principal (Fashion, Lifestyle, Beauty, etc)
2. Identifica CONTENT TYPES (Hauls, Unboxings, GRWM, etc)
3. Calcula FIT SCORE (1-5):
   - 5: Perfeito (fashion/luxury influencer, audiência ideal)
   - 4: Muito bom (lifestyle com estética compatível)
   - 3: Bom (pode funcionar com conteúdo certo)
   - 2: Médio (audiência ou estilo não ideal)
   - 1: Fraco (niche incompatível)
4. Explica o REASONING (2-3 frases)

Retorna APENAS JSON válido (sem markdown):
{
  "fitScore": 4,
  "niche": "Fashion & Lifestyle",
  "contentTypes": ["Hauls", "GRWM", "Outfit Ideas"],
  "reasoning": "Influencer com foco em moda feminina e lifestyle elegante. Audiência compatível com VECINO (25-40 anos). Estética minimalista alinhada com a marca."
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    
    // Try to parse JSON
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    return {
      fitScore: analysis.fitScore || 3,
      reasoning: analysis.reasoning || 'Análise não disponível',
      niche: analysis.niche || 'Indefinido',
      contentTypes: analysis.contentTypes || [],
    };

  } catch (error) {
    logger.error('FIT ANALYSIS failed', error);
    return {
      fitScore: 3,
      reasoning: 'Erro na análise automática. Revisão manual necessária.',
      niche: 'Indefinido',
      contentTypes: [],
    };
  }
}

export async function POST(request: Request) {
  try {
    const { handle, platform } = await request.json();

    if (!handle) {
      return NextResponse.json({ success: false, error: 'Handle required' }, { status: 400 });
    }

    const cleanHandle = handle.replace('@', '');
    logger.info(`Starting import for @${cleanHandle} (${platform})`);

    // Step 1: Scrape profile data via Apify
    let profileData;
    try {
      const platformUpper = platform === 'tiktok' ? 'TIKTOK' : 'INSTAGRAM';
      profileData = await parseProfile(cleanHandle, platformUpper as any);
      logger.info('Apify scrape successful');
    } catch (error: any) {
      logger.error('Apify scrape failed', error.message);
      return NextResponse.json(
        { success: false, error: `Falha ao importar perfil: ${error.message}` },
        { status: 500 }
      );
    }

    // Step 2: AI analysis for fit score
    logger.info('Starting AI fit analysis...');
    const fitAnalysis = await analyzeFit(profileData);
    logger.info('Fit analysis complete:', fitAnalysis);

    // Step 3: Map to influencer structure
    const influencerData = {
      name: cleanHandle, // Use handle as name initially
      handle: cleanHandle,
      platform: platform,
      
      // Social handles
      tiktokHandle: platform === 'tiktok' ? cleanHandle : null,
      tiktokFollowers: platform === 'tiktok' ? profileData.followers : null,
      instagramHandle: platform === 'instagram' ? cleanHandle : null,
      instagramFollowers: platform === 'instagram' ? profileData.followers : null,
      
      // Avatar
      avatarUrl: profileData.avatar,
      
      // Metrics
      totalLikes: profileData.totalLikes ? profileData.totalLikes.toString() : null,
      engagementRate: profileData.engagementRate,
      averageViews: profileData.averageViews || '1K-10K', // Default estimate
      contentStability: 'HIGH', // Default
      
      // Demographics
      country: 'Portugal', // Default
      language: 'PT', // Default
      niche: fitAnalysis.niche,
      contentTypes: fitAnalysis.contentTypes,
      primaryPlatform: platform.toUpperCase(),
      
      // Business
      estimatedPrice: profileData.estimatedPrice,
      fitScore: fitAnalysis.fitScore,
      
      // Discovery
      discoveryMethod: 'AI Import',
      notes: `${profileData.biography || ''}\n\nANÁLISE DE FIT:\n${fitAnalysis.reasoning}`,
      
      // Status
      status: 'suggestion', // Start as suggestion
      tier: profileData.followers && profileData.followers < 50000 ? 'micro' : 'macro',
    };

    logger.info('Import complete');

    return NextResponse.json({
      success: true,
      data: influencerData,
      fitAnalysis: fitAnalysis,
    });

  } catch (error) {
    logger.error('POST /api/influencers/import failed', error);
    return handleApiError(error);
  }
}
