import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { parseProfile, type ParsedProfile } from '@/lib/apify-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel hobby plan limit

// ============================================
// SCHEMA
// ============================================

const AnalyzeSchema = z.object({
  handle: z.string().min(1, 'Handle é obrigatório').transform(h => h.replace('@', '').trim()),
  platform: z.enum(['TIKTOK', 'INSTAGRAM']).default('TIKTOK'),
});

// ============================================
// AI ANALYSIS (GEMINI 3 FLASH PREVIEW)
// ============================================

interface AIAnalysis {
  fitScore: number;       // 1-5
  niche: string;          // e.g. "Fashion & Lifestyle"
  tier: string;           // nano, micro, macro, mega
  strengths: string[];
  opportunities: string[];
  summary: string;        // 2-3 paragraph assessment in Portuguese
}

async function analyzeWithGemini(
  handle: string,
  profile: ParsedProfile
): Promise<AIAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
  // Usando o modelo exato confirmado: gemini-3-flash-preview
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Build video descriptions with URLs from posts (max 5)
  const videoInfo = profile.rawData?.posts && profile.rawData.posts.length > 0
    ? profile.rawData.posts.slice(0, 5).map((post: any, i: number) => {
        return `${i + 1}. URL: ${post.webVideoUrl}\n   Caption: "${post.text || 'sem descrição'}"\n   ${post.playCount?.toLocaleString() || '?'} views, ${post.diggCount?.toLocaleString() || '?'} likes`;
      }).join('\n\n')
    : 'Sem vídeos disponíveis';

  const prompt = `Analisa este influencer TikTok para a marca VecinoCustom (joias personalizadas portuguesas).

**Perfil TikTok:**
- Handle: @${handle}
- URL: https://www.tiktok.com/@${handle}
- Seguidores: ${profile.followers?.toLocaleString() || 'desconhecido'}
- Engagement Rate: ${profile.engagementRate?.toFixed(2) || 'desconhecido'}%
- Média Views: ${profile.averageViews || 'desconhecido'}
- Bio: ${profile.biography || 'sem bio'}
- Verificado: ${profile.verified ? 'Sim ✓' : 'Não'}

**Últimos 5 vídeos:**
${videoInfo}

**Sobre a VecinoCustom:**
- Produto: Joias personalizadas (colares, pulseiras, anéis com nomes/iniciais/datas)
- Target: Mulheres 18-35 anos, fashion-conscious
- Mercados: Portugal, Espanha, Brasil
- Valores: Personalização, qualidade, conexão emocional, presentes especiais
- Estilo: Elegante, trendy, moderno, acessível

**Tarefa:**
Avalia o FIT deste influencer com a VecinoCustom. Considera:
1. Estilo de conteúdo (fashion, lifestyle, unboxing, jewelry?)
2. Audiência (demografia, interesses)
3. Estética dos vídeos (qualidade, vibe)
4. Autenticidade e engagement
5. Potencial para promover joias personalizadas

**Responde APENAS com JSON válido (sem markdown):**
{
  "fitScore": <1-5, onde 5 é match perfeito>,
  "niche": "<nicho principal: Fashion, Lifestyle, Beauty, etc>",
  "tier": "<nano|micro|macro|mega baseado em followers>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "opportunities": ["<consideração/risco 1>", "<consideração/risco 2>"],
  "summary": "<2-3 parágrafos em português: descrição do influencer, análise de fit com VecinoCustom, recomendação>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  try {
    const parsed = JSON.parse(jsonText.trim());
    return {
      fitScore: Math.min(5, Math.max(1, parsed.fitScore || 3)),
      niche: parsed.niche || 'Desconhecido',
      tier: parsed.tier || 'micro',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      summary: parsed.summary || 'Análise não disponível',
    };
  } catch (e) {
    logger.warn('Failed to parse Gemini JSON, using defaults', { handle, text, error: e });
    return {
      fitScore: 3,
      niche: 'Desconhecido',
      tier: 'micro',
      strengths: ['Dados insuficientes para análise completa'],
      opportunities: ['Requer análise manual'],
      summary: text || 'Análise automática falhou. Requer revisão manual.',
    };
  }
}

// ============================================
// HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle, platform } = AnalyzeSchema.parse(body);

    if (!process.env.APIFY_TOKEN) {
      return NextResponse.json(
        { error: 'Apify token não configurado' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_API_KEY) {
      logger.warn('GOOGLE_API_KEY not configured, will skip AI analysis');
    }

    // Step 1: Fetch profile data from Apify
    logger.info('Fetching profile from Apify...', { handle });
    let profile: ParsedProfile;
    try {
      profile = await parseProfile(handle, platform);
      logger.info('Apify data received', { 
        handle, 
        followers: profile.followers,
        engagement: profile.engagementRate,
      });
    } catch (apifyError: any) {
      logger.error('Apify fetch failed', { handle, error: apifyError.message });
      return NextResponse.json(
        { error: `Erro ao buscar perfil TikTok: ${apifyError.message}` },
        { status: 502 }
      );
    }

    // Step 2: Analyze with Gemini 3 Flash
    logger.info('Starting Gemini analysis...', { handle });
    let analysis: AIAnalysis;
    try {
      analysis = await analyzeWithGemini(handle, profile);
      logger.info('Gemini analysis complete', { 
        handle, 
        fitScore: analysis.fitScore,
        tier: analysis.tier,
      });
    } catch (geminiError: any) {
      logger.error('Gemini analysis failed, continuing with Apify data only', { handle, error: geminiError });
      const errorMsg = geminiError?.message || 'Erro desconhecido';
      analysis = {
        fitScore: 3,
        niche: 'Desconhecido',
        tier: 'micro',
        strengths: ['Dados do Apify disponíveis'],
        opportunities: [`Análise AI falhou: ${errorMsg}`, 'Requer revisão manual'],
        summary: `Análise AI indisponível (erro: ${errorMsg}). Dados básicos importados do TikTok via Apify.`,
      };
    }

    // Step 3: Return combined data
    const result = {
      // From Apify
      handle: profile.handle,
      platform: profile.platform,
      followers: profile.followers,
      totalLikes: profile.totalLikes,
      engagement: profile.engagementRate,
      averageViews: profile.averageViews,
      biography: profile.biography,
      verified: profile.verified,
      videoCount: profile.videoCount,
      estimatedPrice: profile.estimatedPrice,
      avatar: profile.avatar,
      
      // From AI
      fitScore: analysis.fitScore,
      niche: analysis.niche,
      tier: analysis.tier,
      strengths: analysis.strengths,
      opportunities: analysis.opportunities,
      summary: analysis.summary,
      
      // Derived
      country: null, // TODO: infer from content/bio
    };

    logger.info('Analysis complete', { handle, fitScore: result.fitScore });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('POST /api/worker/analyze-influencer failed', error);
    return handleApiError(error);
  }
}
