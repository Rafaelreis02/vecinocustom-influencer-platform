import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseProfile } from '@/lib/apify-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateApiKey } from '@/lib/api-auth';

// ============================================
// RE-ANALYZE INFLUENCER (POST)
// ============================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // AUTH
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer não encontrado' }, { status: 404 });
    }

    // Determine platform and handle
    const platform = influencer.tiktokHandle ? 'TIKTOK' : 'INSTAGRAM';
    const handle = (influencer.tiktokHandle || influencer.instagramHandle || '').replace('@', '');

    if (!handle) {
      return NextResponse.json({ error: 'Handle não encontrado' }, { status: 400 });
    }

    logger.info(`[Re-analyze] Starting for @${handle} (${platform})`);

    // Fetch fresh profile data
    let profile;
    try {
      profile = await parseProfile(handle, platform as 'TIKTOK' | 'INSTAGRAM');
    } catch (error: any) {
      logger.error('[Re-analyze] Apify fetch failed', { handle, error: error.message });
      return NextResponse.json(
        { error: `Erro ao buscar dados: ${error.message}` },
        { status: 502 }
      );
    }

    // Run AI analysis
    let analysis;
    const hasApiKey = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    
    if (hasApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const prompt = `Analisa este influencer para a marca VecinoCustom (joias personalizadas portuguesas).

INFLUENCER:
- Handle: @${handle}
- Seguidores: ${profile.followers?.toLocaleString() || 'desconhecido'}
- Bio: ${profile.biography || 'sem bio'}

Sobre a VecinoCustom:
- Produto: Joias personalizadas (colares, pulseiras, anéis com nomes/iniciais/datas)
- Target: Mulheres 18-35 anos
- Valores: Personalização, qualidade, conexão emocional

Retorna APENAS JSON válido:
{
  "fitScore": <1-5>,
  "niche": "<nicho principal>",
  "summary": "<2-3 parágrafos em português>",
  "estimatedPrice": <número em euros>
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Parse JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          analysis = {
            fitScore: parsed.fitScore || 3,
            niche: parsed.niche || 'Desconhecido',
            summary: parsed.summary || 'Análise não disponível',
            estimatedPrice: parsed.estimatedPrice || null,
          };
        }
      } catch (aiError: any) {
        logger.error('[Re-analyze] AI failed', { handle, error: aiError.message });
      }
    }

    // Fallback if no analysis
    if (!analysis) {
      analysis = {
        fitScore: influencer.fitScore || 3,
        niche: influencer.niche || 'Desconhecido',
        summary: hasApiKey 
          ? 'Análise AI falhou. Tenta novamente.' 
          : 'Configura a GOOGLE_API_KEY para ativar a análise AI.',
        estimatedPrice: influencer.estimatedPrice,
      };
    }

    // Update influencer with new analysis
    const updated = await prisma.influencer.update({
      where: { id },
      data: {
        fitScore: analysis.fitScore,
        niche: analysis.niche,
        estimatedPrice: analysis.estimatedPrice,
        analysisSummary: analysis.summary,
        analysisDate: new Date(),
      },
    });

    logger.info('[Re-analyze] Complete', { 
      handle, 
      fitScore: analysis.fitScore,
      niche: analysis.niche 
    });

    return NextResponse.json({
      success: true,
      fitScore: analysis.fitScore,
      niche: analysis.niche,
      summary: analysis.summary,
      estimatedPrice: analysis.estimatedPrice,
    });

  } catch (error) {
    logger.error('POST /api/influencers/[id]/reanalyze failed', error);
    return handleApiError(error);
  }
}
