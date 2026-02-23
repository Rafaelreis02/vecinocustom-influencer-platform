import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * API Prospectador - Versão Simplificada
 * Input: seed (obrigatório), max (opcional), platform (opcional)
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
const ACTOR_FOLLOWING = 'i7JuI8WcwN94blNMb';
const MIN_FOLLOWERS = 5000;
const MAX_FOLLOWERS = 150000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const memoryCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const modelPrimary = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
const modelFallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('Max retries reached');
}

async function runApifyActor(actorId: string, input: any): Promise<any[]> {
  const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!startRes.ok) {
    const errorText = await startRes.text();
    throw new Error(`Failed to start actor: ${startRes.status} - ${errorText.substring(0, 200)}`);
  }
  
  const { data: { id: runId, defaultDatasetId } } = await startRes.json();
  
  const startTime = Date.now();
  while (Date.now() - startTime < 120000) {
    await new Promise(r => setTimeout(r, 3000));
    
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    if (!statusRes.ok) continue;
    
    const { data: { status } } = await statusRes.json();
    
    if (status === 'SUCCEEDED') {
      const dataRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`);
      return await dataRes.json();
    }
    
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Actor ${status}`);
    }
  }
  
  throw new Error('Timeout');
}

interface FollowingData {
  handle: string;
  followers: number;
  name: string;
}

async function scrapeFollowingWithData(handle: string, count: number): Promise<FollowingData[]> {
  const key = getCacheKey(handle, 'following_data');
  const cached = getFromCache(key);
  if (cached) return cached;

  const data = await withRetry(() => runApifyActor(ACTOR_FOLLOWING, {
    profiles: [handle],
    resultsPerPage: Math.min(count, 200),
    followers: 0,
    following: count,
    maxFollowersPerProfile: MAX_FOLLOWERS,
    maxFollowingPerProfile: 10000
  }));

  const profiles: FollowingData[] = data
    ?.filter((item: any) => item.authorMeta?.name)
    .map((item: any) => ({
      handle: item.authorMeta.name,
      followers: item.authorMeta.fans || 0,
      name: item.authorMeta.nickName || item.authorMeta.name
    })) || [];

  const unique = new Map<string, FollowingData>();
  profiles.forEach(p => {
    const existing = unique.get(p.handle.toLowerCase());
    if (!existing || p.followers > existing.followers) {
      unique.set(p.handle.toLowerCase(), p);
    }
  });

  const result = Array.from(unique.values());
  setCache(key, result);
  return result;
}

async function scrapeProfile(handle: string): Promise<any[]> {
  const key = getCacheKey(handle, 'profile');
  const cached = getFromCache(key);
  if (cached) return cached;

  const data = await withRetry(() => runApifyActor(ACTOR_PROFILE, {
    profiles: [`https://www.tiktok.com/@${handle}`],
    resultsPerPage: 10
  }));

  if (!data?.length) throw new Error('No data');
  setCache(key, data);
  return data;
}

async function generateWithFallback(prompt: string): Promise<string> {
  try {
    return (await modelPrimary.generateContent(prompt)).response.text();
  } catch {
    return (await modelFallback.generateContent(prompt)).response.text();
  }
}

async function validateProfile(handle: string, profileData: any[]): Promise<{ valid: boolean; reason?: string }> {
  const author = profileData[0]?.authorMeta;
  if (!author) return { valid: false, reason: 'No author data' };
  
  const followers = author.fans || 0;
  if (followers < MIN_FOLLOWERS || followers > MAX_FOLLOWERS) {
    return { valid: false, reason: `Followers out of range (${followers})` };
  }

  const prompt = `Analyze this TikTok profile for a jewelry brand:
Handle: @${handle}
Name: ${author.nickName || author.name}
Bio: ${author.signature || 'No bio'}
Followers: ${followers}

Respond ONLY with JSON:
{"isRealPerson": boolean, "isFemale": boolean, "isSuitable": boolean, "reason": "brief explanation"}`;

  try {
    const text = await generateWithFallback(prompt);
    const analysis = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    return {
      valid: analysis.isRealPerson && analysis.isFemale && analysis.isSuitable,
      reason: analysis.reason
    };
  } catch {
    return { valid: true, reason: 'Validation failed, assuming valid' };
  }
}

function calculateEngagement(profileData: any[]): number {
  const posts = profileData.filter((i: any) => i.webVideoUrl);
  if (!posts.length) return 0;
  
  const followers = profileData[0]?.authorMeta?.fans || 1;
  const interactions = posts.reduce((sum: number, p: any) => 
    sum + (p.diggCount || 0) + (p.commentCount || 0) + (p.shareCount || 0), 0
  );
  
  return parseFloat(((interactions / posts.length) / followers * 100).toFixed(2));
}

async function analyzeFit(handle: string, profileData: any[], engagement: number) {
  const author = profileData[0]?.authorMeta;
  const posts = profileData.filter((i: any) => i.webVideoUrl).slice(0, 5);

  const prompt = `Analyze this influencer for VecinoCustom (Portuguese jewelry brand):

Profile: @${handle}
Name: ${author?.nickName || handle}
Followers: ${author?.fans || 'N/A'}
Engagement: ${engagement}%
Bio: ${author?.signature || 'N/A'}

Recent posts:
${posts.map((p: any, i: number) => `${i+1}. "${(p.text || '').substring(0, 80)}..." - ${p.playCount || 0} views`).join('\n')}

Respond ONLY with JSON:
{
  "fitScore": 1-5,
  "niche": "Fashion/Lifestyle/Beauty/etc",
  "tier": "nano/micro/macro/mega",
  "estimatedPrice": 50-500,
  "contentTypes": ["type1", "type2"],
  "strengths": ["point1", "point2"],
  "summary": "2-3 paragraphs in Portuguese",
  "country": "PT/ES/IT/etc"
}`;

  try {
    const text = await generateWithFallback(prompt);
    const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(match?.[1] || match?.[0] || text);

    return {
      fitScore: Math.min(5, Math.max(1, analysis.fitScore || 3)),
      niche: analysis.niche || 'Lifestyle',
      tier: analysis.tier || 'micro',
      estimatedPrice: analysis.estimatedPrice || 60,
      contentTypes: Array.isArray(analysis.contentTypes) ? analysis.contentTypes : ['General'],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      summary: analysis.summary || 'No summary available',
      country: analysis.country || 'PT'
    };
  } catch {
    return {
      fitScore: 3,
      niche: 'Lifestyle',
      tier: 'micro',
      estimatedPrice: 60,
      contentTypes: ['General'],
      strengths: ['Data available'],
      summary: 'Analysis failed, manual review needed.',
      country: 'PT'
    };
  }
}

async function handleExistsInDB(handle: string): Promise<boolean> {
  const clean = handle.replace('@', '').toLowerCase();
  const result = await prisma.$queryRaw`
    SELECT id FROM influencers 
    WHERE LOWER("tiktokHandle") = ${clean} OR LOWER("instagramHandle") = ${clean}
    LIMIT 1
  `;
  return Array.isArray(result) && result.length > 0;
}

export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  let totalApiCalls = 0;
  let savedApiCalls = 0;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seed, max = 50, platform = 'tiktok', dryRun = false } = await request.json();

    // Validações
    if (!APIFY_TOKEN || !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing API tokens' }, { status: 500 });
    }

    if (!seed) {
      return NextResponse.json({ error: 'Seed is required. Please provide a TikTok handle (e.g., @username)' }, { status: 400 });
    }

    // Limpar seed (remover @ se existir)
    const cleanSeed = seed.replace('@', '');

    if (max < 1 || max > 50) {
      return NextResponse.json({ error: 'Max must be 1-50' }, { status: 400 });
    }

    if (platform !== 'tiktok') {
      return NextResponse.json({ error: 'Only TikTok is supported for now' }, { status: 400 });
    }

    logger.info(`[PROSPECTOR] Starting with seed: @${cleanSeed}, max: ${max}, platform: ${platform}`);

    // 1. SCRAPE FOLLOWING DA SEED
    let followingProfiles: FollowingData[];
    try {
      followingProfiles = await scrapeFollowingWithData(cleanSeed, 200);
      totalApiCalls++;
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to scrape seed: ${err.message}` }, { status: 500 });
    }

    if (followingProfiles.length === 0) {
      return NextResponse.json({ 
        error: `Seed @${cleanSeed} has no visible following. The profile might be private or have no following.` 
      }, { status: 400 });
    }

    logger.info(`[PROSPECTOR] Found ${followingProfiles.length} following from seed @${cleanSeed}`);

    // 2. FILTRAR POR FOLLOWERS
    const validProfiles = followingProfiles.filter(p => 
      p.followers >= MIN_FOLLOWERS && p.followers <= MAX_FOLLOWERS
    );
    
    savedApiCalls = followingProfiles.length - validProfiles.length;
    logger.info(`[PROSPECTOR] Filtered ${validProfiles.length}/${followingProfiles.length} by follower count (5k-150k)`);

    // 3. PROCESSAR CADA PERFIL
    let processed = 0, imported = 0, skipped = 0, failed = 0;
    const results: any[] = [];

    for (const profileData of validProfiles) {
      if (processed >= max) break;

      const handle = profileData.handle;

      // Verificar duplicado
      if (await handleExistsInDB(handle)) {
        skipped++;
        continue;
      }

      try {
        // Scrape perfil detalhado
        let profile;
        try {
          profile = await scrapeProfile(handle);
          totalApiCalls++;
        } catch {
          skipped++;
          continue;
        }

        // Validar
        const validation = await validateProfile(handle, profile);
        if (!validation.valid) {
          skipped++;
          continue;
        }

        // Calcular engagement
        const engagement = calculateEngagement(profile);

        // Analisar com Gemini
        const analysis = await analyzeFit(handle, profile, engagement);

        if (analysis.fitScore < 3) {
          skipped++;
          continue;
        }

        // Importar para DB
        if (!dryRun) {
          const author = profile[0]?.authorMeta;
          await prisma.influencer.create({
            data: {
              name: author?.nickName || handle,
              tiktokHandle: `@${handle}`,
              tiktokFollowers: author?.fans || 0,
              engagementRate: engagement,
              country: analysis.country,
              language: 'PT', // Default para PT
              niche: analysis.niche,
              contentTypes: analysis.contentTypes,
              fitScore: analysis.fitScore,
              status: 'SUGGESTION',
              discoveryMethod: 'AUTOMATED_API',
              analysisSummary: analysis.summary,
              estimatedPrice: analysis.estimatedPrice,
              tier: analysis.tier,
              biography: author?.signature || '',
              createdById: session.user.id
            }
          });
        }

        imported++;
        results.push({ 
          handle, 
          fitScore: analysis.fitScore, 
          niche: analysis.niche,
          followers: author?.fans || 0
        });

      } catch (err: any) {
        failed++;
      }

      processed++;
      await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json({
      success: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      stats: {
        seed: cleanSeed,
        platform,
        totalFollowing: followingProfiles.length,
        filteredByFollowers: validProfiles.length,
        processed,
        imported,
        skipped,
        failed,
        apiCalls: totalApiCalls,
        apiCallsSaved: savedApiCalls,
        mode: dryRun ? 'DRY RUN' : 'PRODUCTION'
      },
      results
    });

  } catch (error: any) {
    logger.error('[PROSPECTOR] Fatal error', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
