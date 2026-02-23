import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * API Prospectador de Influencers - Versão Integrada (Sem script externo)
 * 
 * POST /api/prospector/run
 * Body: { language: 'PT', max: 50, seed?: '@handle', dryRun?: false }
 */

// ============================================
// CONFIGURAÇÃO
// ============================================

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
const ACTOR_FOLLOWING = 'i7JuI8WcwN94blNMb';

const MIN_FOLLOWERS = 5000;
const MAX_FOLLOWERS = 150000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const LANGUAGES = ['PT', 'ES', 'EN', 'DE', 'FR', 'IT'];

// Cache em memória (alternativa ao filesystem)
const memoryCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// ============================================
// CACHE HELPER
// ============================================

function getCacheKey(handle: string, type: string): string {
  return `${type}_${handle.toLowerCase()}`;
}

function getFromCache(key: string): any | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.value;
}

function setCache(key: string, value: any): void {
  memoryCache.set(key, { value, timestamp: Date.now() });
}

// ============================================
// RETRY HELPER
// ============================================

async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      logger.warn(`[PROSPECTOR] Tentativa ${i + 1}/${maxRetries} falhou: ${err.message}`);
      
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }
  
  throw lastError || new Error('Todas as tentativas falharam');
}

// ============================================
// APIFY API
// ============================================

async function runApifyActor(actorId: string, input: any, maxWaitTime = 120000): Promise<any[]> {
  return withRetry(async () => {
    // Iniciar actor
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (!startRes.ok) {
      const err = await startRes.text();
      throw new Error(`Falha ao iniciar actor: ${err.substring(0, 200)}`);
    }

    const runData = await startRes.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;
    
    logger.info(`[PROSPECTOR] Actor iniciado (run: ${runId.substring(0, 8)}...)`);

    // Aguardar conclusão
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      if (!statusRes.ok) continue;
      
      const statusData = await statusRes.json();
      const status = statusData.data.status;

      if (status === 'SUCCEEDED') {
        const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
        if (!dataRes.ok) throw new Error('Falha ao obter dataset');
        return await dataRes.json();
      }

      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
        throw new Error(`Actor run ${status}`);
      }
    }

    throw new Error('Actor run timeout (120s)');
  });
}

async function scrapeProfile(handle: string): Promise<any[]> {
  const cacheKey = getCacheKey(handle, 'profile');
  const cached = getFromCache(cacheKey);
  if (cached) {
    logger.info(`[PROSPECTOR] Cache hit para @${handle}`);
    return cached;
  }

  logger.info(`[PROSPECTOR] Scraping perfil: @${handle}`);
  
  const data = await runApifyActor(ACTOR_PROFILE, {
    profiles: [`https://www.tiktok.com/@${handle}`],
    resultsPerPage: 10
  });

  if (!data || data.length === 0) {
    throw new Error(`Nenhum dado retornado para @${handle}`);
  }

  setCache(cacheKey, data);
  return data;
}

async function scrapeFollowing(handle: string, followingCount: number): Promise<string[]> {
  const cacheKey = getCacheKey(handle, 'following');
  const cached = getFromCache(cacheKey);
  if (cached) {
    logger.info(`[PROSPECTOR] Cache hit para following de @${handle}`);
    return cached;
  }

  logger.info(`[PROSPECTOR] Scraping following de @${handle}`);

  const data = await runApifyActor(ACTOR_FOLLOWING, {
    profiles: [handle],
    resultsPerPage: Math.min(followingCount, 200),
    followers: 0,
    following: followingCount
  });

  if (!data || data.length === 0) {
    logger.warn(`[PROSPECTOR] Nenhum following encontrado para @${handle}`);
    return [];
  }

  const handles = [...new Set(
    data
      .filter((item: any) => item.authorMeta?.name)
      .map((item: any) => item.authorMeta.name)
  )];

  logger.info(`[PROSPECTOR] Encontrados ${handles.length} handles únicos`);
  
  setCache(cacheKey, handles);
  return handles;
}

// ============================================
// GEMINI ANALYSIS
// ============================================

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const modelPrimary = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
const modelFallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateWithFallback(prompt: string): Promise<string> {
  try {
    const result = await modelPrimary.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    logger.warn(`[PROSPECTOR] Gemini 3.0 Flash falhou: ${err.message}`);
    
    try {
      const result = await modelFallback.generateContent(prompt);
      return result.response.text();
    } catch (fallbackErr: any) {
      throw new Error(`Ambos os modelos falharam: ${fallbackErr.message}`);
    }
  }
}

async function validateProfile(handle: string, profileData: any[]): Promise<{ valid: boolean; reason?: string; isFemale?: boolean }> {
  const author = profileData[0]?.authorMeta;
  if (!author) return { valid: false, reason: 'Sem dados do autor' };

  const followers = author.fans || 0;
  
  if (followers < MIN_FOLLOWERS || followers > MAX_FOLLOWERS) {
    return { valid: false, reason: `Followers fora do range (${followers})` };
  }

  const prompt = `Analise este perfil TikTok e determine se é uma pessoa real, feminina, e adequada para marca de joias:

Handle: @${handle}
Nome: ${author.nickName || author.name}
Bio: ${author.signature || 'Sem bio'}
Seguidores: ${followers}
Verificado: ${author.verified ? 'Sim' : 'Não'}

Responda APENAS com JSON:
{
  "isRealPerson": true/false,
  "isFemale": true/false,
  "isSuitable": true/false,
  "reason": "breve explicação"
}`;

  try {
    const text = await generateWithFallback(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    return {
      valid: analysis.isRealPerson && analysis.isFemale && analysis.isSuitable,
      reason: analysis.reason,
      isFemale: analysis.isFemale
    };
  } catch (err: any) {
    logger.warn(`[PROSPECTOR] Erro na validação de @${handle}: ${err.message}`);
    return { valid: true, reason: 'Validação falhou, assume válido' };
  }
}

function calculateEngagement(profileData: any[]): number {
  const posts = profileData.filter((item: any) => item.webVideoUrl);
  if (posts.length === 0) return 0;

  const author = profileData[0]?.authorMeta;
  const followers = author?.fans || 1;

  let totalInteractions = 0;
  posts.forEach((post: any) => {
    totalInteractions += (post.diggCount || 0) + (post.commentCount || 0) + (post.shareCount || 0);
  });

  const avgInteractions = totalInteractions / posts.length;
  return parseFloat(((avgInteractions / followers) * 100).toFixed(2));
}

async function analyzeFit(handle: string, profileData: any[], engagementRate: number) {
  const author = profileData[0]?.authorMeta;
  const posts = profileData.filter((item: any) => item.webVideoUrl).slice(0, 5);

  const prompt = `Analise este influencer para a marca VecinoCustom (joias personalizadas portuguesas):

Perfil: @${handle}
Nome: ${author?.nickName || handle}
Seguidores: ${author?.fans || 'N/A'}
Engagement Rate: ${engagementRate}%
Bio: ${author?.signature || 'N/A'}

Últimos posts:
${posts.map((p: any, i: number) => `${i+1}. "${(p.text || '').substring(0, 80)}..." - ${p.playCount || 0} views, ${p.diggCount || 0} likes`).join('\n')}

Responda APENAS com JSON:
{
  "fitScore": 1-5 (5=perfeito),
  "niche": "Fashion/Lifestyle/Beauty/etc",
  "tier": "nano/micro/macro/mega baseado em followers",
  "estimatedPrice": número em euros (50-500),
  "contentTypes": ["tipo1", "tipo2"],
  "strengths": ["ponto positivo 1", "ponto positivo 2"],
  "summary": "2-3 parágrafos em português",
  "country": "PT/ES/IT/etc (estimado pelo idioma/nome)"
}`;

  try {
    const text = await generateWithFallback(prompt);
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                     text.match(/```\n([\s\S]*?)\n```/) || 
                     text.match(/\{[\s\S]*\}/);
    
    const analysis = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);

    return {
      fitScore: Math.min(5, Math.max(1, analysis.fitScore || 3)),
      niche: analysis.niche || 'Lifestyle',
      tier: analysis.tier || 'micro',
      estimatedPrice: analysis.estimatedPrice || 60,
      contentTypes: Array.isArray(analysis.contentTypes) ? analysis.contentTypes : ['General'],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      summary: analysis.summary || 'Análise não disponível',
      country: analysis.country || 'PT'
    };
  } catch (err: any) {
    logger.warn(`[PROSPECTOR] Erro na análise de @${handle}: ${err.message}`);
    return {
      fitScore: 3,
      niche: 'Lifestyle',
      tier: 'micro',
      estimatedPrice: 60,
      contentTypes: ['General'],
      strengths: ['Dados disponíveis'],
      summary: 'Análise automática falhou. Requer revisão manual.',
      country: 'PT'
    };
  }
}

// ============================================
// DATABASE HELPERS
// ============================================

async function getSeedByLanguage(language: string) {
  const result = await prisma.$queryRaw`
    SELECT id, name, "tiktokHandle", "tiktokFollowers", language, country
    FROM influencers
    WHERE language = ${language}
      AND "tiktokFollowers" BETWEEN ${MIN_FOLLOWERS} AND ${MAX_FOLLOWERS}
      AND status NOT IN ('BLACKLISTED', 'CANCELLED')
    ORDER BY RANDOM()
    LIMIT 1
  `;
  
  return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

async function handleExists(handle: string): Promise<boolean> {
  const cleanHandle = handle.replace('@', '').toLowerCase();
  
  const result = await prisma.$queryRaw`
    SELECT id FROM influencers 
    WHERE LOWER("tiktokHandle") = ${cleanHandle} 
       OR LOWER("instagramHandle") = ${cleanHandle}
    LIMIT 1
  `;
  
  return Array.isArray(result) && result.length > 0;
}

async function insertInfluencer(data: any, userId: string) {
  return prisma.influencer.create({
    data: {
      name: data.name,
      tiktokHandle: data.handle,
      tiktokFollowers: data.followers,
      engagementRate: data.engagementRate,
      country: data.country,
      language: data.language,
      niche: data.niche,
      contentTypes: data.contentTypes,
      fitScore: data.fitScore,
      status: 'SUGGESTION',
      discoveryMethod: 'AUTOMATED_API',
      analysisSummary: data.analysisSummary,
      estimatedPrice: data.estimatedPrice,
      tier: data.tier,
      biography: data.biography,
      createdBy: userId
    }
  });
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { language, max = 50, seed, dryRun = false } = body;

    // Validar configuração
    if (!APIFY_TOKEN || !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'APIFY_TOKEN ou GEMINI_API_KEY não configurados' },
        { status: 500 }
      );
    }

    // Validar idioma
    if (!language || !LANGUAGES.includes(language.toUpperCase())) {
      return NextResponse.json(
        { error: `Idioma inválido. Use: ${LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    if (max < 1 || max > 50) {
      return NextResponse.json(
        { error: 'Máximo deve ser entre 1 e 50' },
        { status: 400 }
      );
    }

    logger.info('[PROSPECTOR] Iniciando execução', { 
      language, max, seed, dryRun, user: session.user.id 
    });

    // 1. SELECIONAR SEMENTE
    let seedData;
    if (seed) {
      seedData = {
        name: seed,
        tiktokHandle: seed,
        tiktokFollowers: 0,
        language: language.toUpperCase()
      };
    } else {
      seedData = await getSeedByLanguage(language.toUpperCase());
      if (!seedData) {
        return NextResponse.json(
          { error: `Nenhuma semente encontrada para idioma ${language}` },
          { status: 404 }
        );
      }
    }

    logger.info(`[PROSPECTOR] Semente: ${seedData.name} (@${seedData.tiktokHandle})`);

    // 2. SCRAP SEMENTE
    let seedProfile;
    try {
      seedProfile = await withRetry(() => scrapeProfile(seedData.tiktokHandle));
    } catch (err: any) {
      return NextResponse.json(
        { error: `Falha ao scrap semente: ${err.message}` },
        { status: 500 }
      );
    }

    const author = seedProfile[0]?.authorMeta;
    const followingCount = author?.following || 0;
    
    if (followingCount === 0) {
      return NextResponse.json(
        { error: 'Semente não tem following visível' },
        { status: 400 }
      );
    }

    // 3. SCRAP FOLLOWING
    let followingHandles;
    try {
      followingHandles = await withRetry(() => 
        scrapeFollowing(seedData.tiktokHandle, followingCount)
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: `Falha ao scrap following: ${err.message}` },
        { status: 500 }
      );
    }

    if (followingHandles.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum following encontrado' },
        { status: 404 }
      );
    }

    // 4. PROCESSAR CADA FOLLOWING
    let processed = 0;
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const results: any[] = [];

    for (const handle of followingHandles) {
      if (processed >= max) break;

      logger.info(`[PROSPECTOR] [${processed + 1}/${max}] Processando @${handle}`);

      // Verificar duplicados
      const exists = await handleExists(handle);
      if (exists) {
        logger.warn(`[PROSPECTOR] @${handle} já existe`);
        skipped++;
        continue;
      }

      try {
        // Scrap perfil
        let profileData;
        try {
          profileData = await withRetry(() => scrapeProfile(handle));
        } catch {
          skipped++;
          continue;
        }
        
        // Validar
        const validation = await validateProfile(handle, profileData);
        if (!validation.valid) {
          logger.warn(`[PROSPECTOR] @${handle} rejeitado: ${validation.reason}`);
          skipped++;
          continue;
        }

        // Calcular engagement
        const engagementRate = calculateEngagement(profileData);
        logger.info(`[PROSPECTOR] Engagement: ${engagementRate}%`);

        // Analisar
        const analysis = await analyzeFit(handle, profileData, engagementRate);
        logger.info(`[PROSPECTOR] Fit Score: ${analysis.fitScore}/5`);

        if (analysis.fitScore < 3) {
          logger.warn(`[PROSPECTOR] @${handle} descartado (fit < 3)`);
          skipped++;
          continue;
        }

        // Importar
        if (!dryRun) {
          const author = profileData[0]?.authorMeta;
          await insertInfluencer({
        userId: session.user.id,
            name: author?.nickName || handle,
            handle: `@${handle}`,
            followers: author?.fans || 0,
            engagementRate,
            country: analysis.country,
            language: language.toUpperCase(),
            niche: analysis.niche,
            contentTypes: analysis.contentTypes,
            fitScore: analysis.fitScore,
            analysisSummary: analysis.summary,
            estimatedPrice: analysis.estimatedPrice,
            tier: analysis.tier,
            biography: author?.signature || ''
          });
        }

        imported++;
        results.push({ handle, fitScore: analysis.fitScore, niche: analysis.niche });

      } catch (err: any) {
        logger.error(`[PROSPECTOR] Erro ao processar @${handle}: ${err.message}`);
        failed++;
      }

      processed++;
      await new Promise(r => setTimeout(r, 1000)); // Rate limiting
    }

    // 5. RELATÓRIO
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return NextResponse.json({
      success: true,
      message: `Prospecção concluída em ${duration}s`,
      stats: {
        idioma: language.toUpperCase(),
        semente: `@${seedData.tiktokHandle}`,
        processados: processed,
        importados: imported,
        ignorados: skipped,
        falhas: failed,
        modo: dryRun ? 'DRY RUN' : 'PRODUÇÃO'
      },
      results
    });

  } catch (error: any) {
    logger.error('[PROSPECTOR] Erro fatal', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
