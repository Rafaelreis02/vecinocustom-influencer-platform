/**
 * GET /api/debug/analyze-test
 * 
 * Testa a API de análise de influencers
 * Usar para verificar se Apify e Gemini estão configurados
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      APIFY_TOKEN: process.env.APIFY_TOKEN ? '✅ Configurado' : '❌ Não configurado',
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '✅ Configurado' : '❌ Não configurado',
    },
    tests: {}
  };

  // Test 1: Verificar Apify
  try {
    const { parseProfile } = await import('@/lib/apify-fetch');
    results.tests.apify = {
      status: 'Module loaded ✅',
      note: 'Para testar completo, usar POST /api/worker/analyze-influencer com body: {"handle":"exemplo","platform":"TIKTOK"}'
    };
  } catch (error) {
    results.tests.apify = {
      status: '❌ Erro ao carregar módulo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }

  // Test 2: Verificar Gemini
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    results.tests.gemini = {
      status: 'Module loaded ✅',
      note: 'Chave API está configurada, mas só sabemos se funciona ao fazer uma chamada real'
    };
  } catch (error) {
    results.tests.gemini = {
      status: '❌ Erro ao carregar módulo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }

  return NextResponse.json(results);
}

/**
 * POST /api/debug/analyze-test
 * 
 * Testa a análise completa com um handle específico
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle, platform = 'TIKTOK' } = body;

    if (!handle) {
      return NextResponse.json({ error: 'Handle é obrigatório' }, { status: 400 });
    }

    logger.info('[DEBUG] Testing analyze API', { handle, platform });

    // Chamar a API de análise internamente
    const analyzeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/worker/analyze-influencer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, platform }),
    });

    const data = await analyzeRes.json();

    return NextResponse.json({
      success: analyzeRes.ok,
      status: analyzeRes.status,
      data: analyzeRes.ok ? data : null,
      error: !analyzeRes.ok ? data : null,
    });

  } catch (error) {
    logger.error('[DEBUG] Test failed', { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
