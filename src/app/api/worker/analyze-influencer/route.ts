import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { parseProfile, type ParsedProfile } from '@/lib/apify-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateApiKey } from '@/lib/api-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Cache opcional (Redis) - só ativo se env vars existirem
let redis: any = null;
try {
  const { Redis } = require('@upstash/redis');
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch {
  // Redis não disponível
}

const CACHE_TTL = 60 * 60 * 24; // 24 horas


async function getCachedAnalysis(handle: string, platform: string) {
  try {
    if (!redis) return null;
    const key = `influencer:${platform.toLowerCase()}:${handle.toLowerCase()}`;
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function cacheAnalysis(handle: string, platform: string, data: any) {
  try {
    if (!redis) return;
    const key = `influencer:${platform.toLowerCase()}:${handle.toLowerCase()}`;
    await redis.setex(key, CACHE_TTL, data);
  } catch {
    // Silent fail - cache é optional
  }
}

// ============================================
// SCHEMA & AUTH
// ============================================

const AnalyzeSchema = z.object({
  handle: z.string().min(1, 'Handle é obrigatório').transform(h => h.replace('@', '').trim()),
  platform: z.enum(['TIKTOK', 'INSTAGRAM']).default('TIKTOK'),
  dryRun: z.boolean().default(false),
});

// ============================================
// AI ANALYSIS (GEMINI 3 FLASH PREVIEW)
// ============================================

interface AIAnalysis {
  fitScore: number;
  niche: string;
  tier: string;
  strengths: string[];
  opportunities: string[];
  summary: string;
  estimatedPrice: number | null;
}

async function analyzeWithGemini(
  handle: string,
  platform: 'TIKTOK' | 'INSTAGRAM',
  profile: ParsedProfile
): Promise<AIAnalysis> {
  // Try gemini-3-flash-preview first, fallback to gemini-1.5-flash-latest
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');
  const modelPrimary = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const modelFallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  // Helper to try primary then fallback
  async function generateWithFallbackModel(prompt: string): Promise<string> {
    try {
      const result = await modelPrimary.generateContent(prompt);
      return result.response.text();
    } catch (primaryError: any) {
      // If primary fails (404 or other error), try fallback
      logger.warn('Primary model failed, trying fallback', { error: primaryError.message });
      const result = await modelFallback.generateContent(prompt);
      return result.response.text();
    }
  }

  const posts = profile.rawData?.posts || profile.rawData?.latestPosts || [];
  const contentInfo = posts.length > 0
    ? posts.slice(0, 5).map((post: any, i: number) => {
        const url = post.webVideoUrl || post.url || post.shortCode || '';
        const caption = post.text || post.caption || 'sem descrição';
        const views = post.playCount || post.videoViewCount || 0;
        const likes = post.diggCount || post.likesCount || 0;
        return `${i + 1}. URL: ${url}\n   Caption: "${caption.substring(0, 100)}..."\n   ${views ? views.toLocaleString() + ' views, ' : ''}${likes.toLocaleString()} likes`;
      }).join('\n\n')
    : 'Sem conteúdo recente disponível';

  const platformName = platform === 'TIKTOK' ? 'TikTok' : 'Instagram';
  const profileUrl = platform === 'TIKTOK' ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}/`;

  const prompt = `Analisa este influencer ${platformName} para a marca VecinoCustom (joias personalizadas portuguesas).

**Perfil ${platformName}:**
- Handle: @${handle}
- URL: ${profileUrl}
- Seguidores: ${profile.followers?.toLocaleString() || 'desconhecido'}
- Engagement Rate: ${profile.engagementRate?.toFixed(2) || 'desconhecido'}%
- Bio: ${profile.biography || 'sem bio'}
- Verificado: ${profile.verified ? 'Sim ✓' : 'Não'}

**Últimos posts/vídeos:**
${contentInfo}

**Sobre a VecinoCustom:**
- Produto: Joias personalizadas (colares, pulseiras, anéis com nomes/iniciais/datas)
- Target: Mulheres 18-35 anos, fashion-conscious
- Mercados: Portugal, Espanha, Brasil
- Valores: Personalização, qualidade, conexão emocional, presentes especiais
- Estilo: Elegante, trendy, moderno, acessível

**Tarefa:**
Avalia o FIT deste influencer com a VecinoCustom. Considera:
1. Estilo de conteúdo (fashion, lifestyle, unboxing, jewelry?)
2. Audiência provável (demografia, interesses)
3. Estética visual (qualidade, vibe, luz natural vs artificial)
4. Autenticidade e engagement
5. Potencial para promover joias personalizadas

**Estimativa de Preço (Importante):**
Baseado no país provável (PT/ES/IT) e seguidores, estima um valor justo por post/vídeo.

**Responde APENAS com JSON válido (sem markdown):**
{
  "fitScore": <1-5>,
  "niche": "<nicho principal>",
  "tier": "<nano|micro|macro|mega>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "opportunities": ["<consideração 1>", "<consideração 2>"],
  "summary": "<2-3 parágrafos em português>",
  "estimatedPrice": <número em euros>
}`;

  const text = await generateWithFallbackModel(prompt);
  
  // Try multiple parsing strategies
  let parsed = null;
  
  // Strategy 1: Try to find JSON in markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || 
                    text.match(/```\s*([\s\S]*?)\s*```/i);
  
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {}
  }
  
  // Strategy 2: Try to find any JSON object in the text
  if (!parsed) {
    const anyJsonMatch = text.match(/\{[\s\S]*\}/);
    if (anyJsonMatch) {
      try {
        parsed = JSON.parse(anyJsonMatch[0]);
      } catch {}
    }
  }
  
  // If still no parsed, return default with the raw text
  if (!parsed) {
    logger.warn('Could not parse Gemini JSON, using raw text', { handle, textLength: text.length });
    return {
      fitScore: 3,
      niche: 'Desconhecido',
      tier: 'micro',
      strengths: ['Dados disponíveis'],
      opportunities: ['Análise detalhada indisponível'],
      summary: text.substring(0, 500) || 'Análise não disponível',
      estimatedPrice: null,
    };
  }

  try {
    return {
      fitScore: Math.min(5, Math.max(1, parsed.fitScore || 3)),
      niche: parsed.niche || 'Desconhecido',
      tier: parsed.tier || 'micro',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      summary: parsed.summary || 'Análise não disponível',
      estimatedPrice: typeof parsed.estimatedPrice === 'number' ? parsed.estimatedPrice : null,
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
      estimatedPrice: null,
    };
  }
}

// ============================================
// HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    // AUTH: Verificar sessão do NextAuth OU API key
    const authHeader = request.headers.get('authorization');
    let isAuthenticated = false;
    let authMethod = 'none';
    
    // 1. Try API Key auth (for agents)
    if (authHeader?.startsWith('Bearer vecino_sk_')) {
      const auth = await validateApiKey(authHeader);
      if (auth.success) {
        isAuthenticated = true;
        authMethod = 'api_key';
        logger.info('API Key auth', { role: auth.role });
      }
    }
    
    // 2. If not authenticated via API key, try NextAuth session
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        isAuthenticated = true;
        authMethod = 'session';
        logger.info('NextAuth session valid', { userId: session.user.id });
      }
    }

    // 3. If still not authenticated, return 401
    if (!isAuthenticated) {
      logger.warn('Authentication failed', { 
        authHeader: authHeader?.substring(0, 20), 
        authMethod 
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = AnalyzeSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    
    const { handle, platform, dryRun } = result.data;

    // CHECK CACHE
    const cached = await getCachedAnalysis(handle, platform);
    if (cached) {
      logger.info('Cache hit', { handle, platform });
      return NextResponse.json({ ...cached, fromCache: true });
    }

    if (!process.env.APIFY_TOKEN) {
      return NextResponse.json(
        { error: 'Apify token não configurado' },
        { status: 500 }
      );
    }
    
    // Step 1: Fetch profile data from Apify
    logger.info(`Fetching ${platform} profile from Apify...`, { handle });
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
        { error: `Erro ao buscar perfil ${platform}: ${apifyError.message}` },
        { status: 502 }
      );
    }

    // Step 2: Analyze with Gemini 3 Flash
    logger.info('Starting Gemini analysis...', { handle });
    let analysis: any;
    try {
      if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
        analysis = await analyzeWithGemini(handle, platform, profile);
        logger.info('Gemini analysis complete', { 
          handle, 
          fitScore: analysis.fitScore,
          tier: analysis.tier,
        });
      } else {
        logger.warn('GOOGLE_API_KEY missing, skipping AI analysis');
        analysis = {
          fitScore: 3,
          niche: 'Desconhecido',
          tier: 'micro',
          strengths: ['Dados básicos importados'],
          opportunities: ['Sem chave de API para análise avançada'],
          summary: 'Análise AI indisponível (chave API em falta).',
          estimatedPrice: null
        };
      }
    } catch (geminiError: any) {
      logger.error('Gemini analysis failed, continuing with Apify data only', { handle, error: geminiError });
      const errorMsg = geminiError?.message || 'Erro desconhecido';
      analysis = {
        fitScore: 3,
        niche: 'Desconhecido',
        tier: 'micro',
        strengths: ['Dados do Apify disponíveis'],
        opportunities: [`Análise AI falhou: ${errorMsg}`, 'Requer revisão manual'],
        summary: `Análise AI indisponível (erro: ${errorMsg}). Dados básicos importados do ${platform} via Apify.`,
        estimatedPrice: null
      };
    }

    // Step 3: Prepare result
    const finalResult = {
      handle: profile.handle,
      platform: profile.platform,
      followers: profile.followers,
      totalLikes: profile.totalLikes,
      engagement: profile.engagementRate,
      averageViews: profile.averageViews,
      biography: profile.biography,
      verified: profile.verified,
      videoCount: profile.videoCount,
      estimatedPrice: analysis.estimatedPrice || profile.estimatedPrice,
      avatar: profile.avatar,
      email: profile.email,
      fitScore: analysis.fitScore,
      niche: analysis.niche,
      tier: analysis.tier,
      strengths: analysis.strengths,
      opportunities: analysis.opportunities,
      summary: analysis.summary,
      country: null,
      dryRun,
    };

    // CACHE the result
    await cacheAnalysis(handle, platform, finalResult);

    logger.info('Analysis complete', { handle, fitScore: finalResult.fitScore, cached: true });

    return NextResponse.json(finalResult);
  } catch (error: any) {
    logger.error('POST /api/worker/analyze-influencer failed', error);
    return handleApiError(error);
  }
}
