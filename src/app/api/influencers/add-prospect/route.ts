import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      tiktokHandle,
      tiktokFollowers,
      country,
      language,
      engagementRate,
      niche,
    } = body;

    if (!name || !tiktokHandle || !country) {
      return NextResponse.json(
        { error: 'Nome, handle e país são obrigatórios' },
        { status: 400 }
      );
    }

    // Análise com Gemini 3-flash
    logger.info('[PROSPECTING] Analisando influencer com Gemini', {
      name,
      tiktokHandle,
      country,
    });

    const prompt = `Análise rápida de influencer para marca de joias (Vecino Custom):

Nome: ${name}
Handle: ${tiktokHandle}
País: ${country}
Idioma: ${language}
Seguidores: ${tiktokFollowers}
Engagement: ${engagementRate}%
Nicho: ${niche}

Por favor, fornece:
1. PONTOS FORTES (3 max)
2. PREÇO ESTIMADO (€)
3. RISCO (Alto/Médio/Baixo)
4. RECOMENDAÇÃO (Contactar/Validar Mais/Skip)
5. ANÁLISE (1-2 frases)

Formato: Cada linha começa com a categoria.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();

    logger.info('[PROSPECTING] Análise recebida de Gemini', {
      analysisLength: analysisText.length,
    });

    // Extrair informações da análise
    const estimatedPrice = extractPrice(analysisText);
    const recommendation = extractRecommendation(analysisText);
    const risk = extractRisk(analysisText);

    // Preparar notas internas com análise do Gemini
    const notes = `Scout Prospecting - ${new Date().toLocaleDateString('pt-PT')}

ANÁLISE GEMINI 3-FLASH:
${analysisText}

---
RECOMENDAÇÃO: ${recommendation}
PREÇO EST.: ${estimatedPrice}€
RISCO: ${risk}`;

    // Adicionar à BD com status SUGGESTION
    const influencer = await prisma.influencer.create({
      data: {
        name,
        email: undefined,
        tiktokHandle,
        tiktokFollowers,
        country,
        language,
        primaryPlatform: 'TikTok',
        status: 'SUGGESTION',
        engagementRate: parseFloat(engagementRate) || 0,
        niche,
        verified: false,
        notes,
        createdById: session.user.id,
      },
    });

    logger.info('[PROSPECTING] Influencer adicionado com sucesso', {
      influencerId: influencer.id,
      name,
      recommendation,
    });

    return NextResponse.json({
      success: true,
      influencer: {
        id: influencer.id,
        name: influencer.name,
        tiktokHandle: influencer.tiktokHandle,
        status: influencer.status,
        analysis: {
          recommendation,
          estimatedPrice,
          risk,
        },
      },
      message: `✅ ${name} adicionado como Sugestão (Recomendação: ${recommendation})`,
    });
  } catch (error: any) {
    logger.error('[PROSPECTING] Erro ao adicionar prospect', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar prospect' },
      { status: 500 }
    );
  }
}

// Helper functions
function extractPrice(text: string): string {
  const match = text.match(/PREÇO\s*(?:EST\.|ESTIMADO)[:\s]+([0-9]+)/i);
  return match ? match[1] : '50';
}

function extractRecommendation(text: string): string {
  if (text.match(/contactar/i)) return 'CONTACTA';
  if (text.match(/valida[r]?\s+mais/i)) return 'VALIDA MAIS';
  if (text.match(/skip|não|sem/i)) return 'SKIP';
  return 'VALIDA MAIS';
}

function extractRisk(text: string): string {
  if (text.match(/risco\s*[:\s]+alto/i)) return 'Alto';
  if (text.match(/risco\s*[:\s]+médio/i)) return 'Médio';
  if (text.match(/risco\s*[:\s]+baixo/i)) return 'Baixo';
  return 'Médio';
}
