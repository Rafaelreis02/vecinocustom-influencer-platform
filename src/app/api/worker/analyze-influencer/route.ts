import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { parseProfile, type ParsedProfile } from '@/lib/apify-fetch';
import Anthropic from '@anthropic-ai/sdk';

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
// SONNET ANALYSIS
// ============================================

interface SonnetAnalysis {
  fitScore: number;       // 1-5
  niche: string;          // e.g. "Fashion & Lifestyle"
  tier: string;           // nano, micro, macro, mega
  strengths: string[];
  opportunities: string[];
  summary: string;        // 2-3 paragraph assessment in Portuguese
}

async function analyzeWithSonnet(
  handle: string,
  profile: ParsedProfile
): Promise<SonnetAnalysis> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const videoSummary = profile.rawData?.videos
    ? profile.rawData.videos.slice(0, 10).map((v: Record<string, unknown>, i: number) => 
        `${i + 1}. "${(v.text as string) || 'sem descrição'}" - ${(v.playCount as number)?.toLocaleString() || '?'} views, ${(v.diggCount as number)?.toLocaleString() || '?'} likes`
      ).join('\n')
    : 'Sem vídeos disponíveis';

  const prompt = `Analisa este influencer TikTok para a marca VecinoCustom (joias personalizadas portuguesas).

**Perfil:**
- Handle: @${handle}
- Seguidores: ${profile.followers?.toLocaleString() || 'desconhecido'}
- Engagement Rate: ${profile.engagementRate?.toFixed(2) || 'desconhecido'}%
- Média Views: ${profile.averageViews || 'desconhecido'}
- Bio: ${profile.biography || 'sem bio'}
- Verificado: ${profile.verified ? 'Sim' : 'Não'}

**Últimos vídeos:**
${videoSummary}

**Sobre a VecinoCustom:**
- Joias personalizadas (colares, pulseiras, anéis com nomes/iniciais)
- Target: Mulheres 18-35, fashion-conscious, mercado PT/ES/BR
- Valores: Personalização, qualidade, conexão emocional
- Estilo: Elegante, trendy, ideal para presente

**Analisa e responde APENAS em JSON válido:**
{
  "fitScore": <1-5, onde 5 é match perfeito>,
  "niche": "<nicho principal do influencer>",
  "tier": "<nano|micro|macro|mega>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "opportunities": ["<oportunidade/risco 1>", "<oportunidade/risco 2>"],
  "summary": "<2-3 parágrafos em português sobre o influencer, fit com a marca, e recomendação>"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1500,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

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
  } catch {
    logger.warn('Failed to parse Sonnet JSON, using defaults', { handle, text });
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

/**
 * POST /api/worker/analyze-influencer
 * 
 * Accepts a TikTok/Instagram handle, fetches data via Apify,
 * analyzes with Sonnet, and returns structured data for import.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle, platform } = AnalyzeSchema.parse(body);

    logger.info('Starting influencer analysis', { handle, platform });

    // Step 1: Fetch profile data from Apify
    logger.info('Fetching profile from Apify...', { handle });
    const profile = await parseProfile(handle, platform);
    logger.info('Apify data received', { 
      handle, 
      followers: profile.followers,
      engagement: profile.engagementRate,
    });

    // Step 2: Analyze with Sonnet
    logger.info('Starting Sonnet analysis...', { handle });
    let analysis: SonnetAnalysis;
    try {
      analysis = await analyzeWithSonnet(handle, profile);
      logger.info('Sonnet analysis complete', { 
        handle, 
        fitScore: analysis.fitScore,
        tier: analysis.tier,
      });
    } catch (sonnetError) {
      logger.error('Sonnet analysis failed, continuing with Apify data only', { handle, error: sonnetError });
      analysis = {
        fitScore: 3,
        niche: 'Desconhecido',
        tier: 'micro',
        strengths: ['Dados do Apify disponíveis'],
        opportunities: ['Análise AI falhou - requer revisão manual'],
        summary: 'Análise AI indisponível. Dados básicos importados do TikTok.',
      };
    }

    // Step 3: Return combined data
    const result = {
      // From Apify
      handle: profile.handle,
      platform: profile.platform,
      followers: profile.followers,
      totalLikes: profile.totalLikes ? Number(profile.totalLikes) : null,
      engagement: profile.engagementRate,
      averageViews: profile.averageViews,
      biography: profile.biography,
      verified: profile.verified,
      estimatedPrice: profile.estimatedPrice,
      
      // From Sonnet
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
