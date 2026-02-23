import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * API Prospectador - Sistema Teia Completo
 * Mantém exatamente a mesma lógica do influencer-prospector.js
 */

// Config
const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';
const ACTOR_FOLLOWING = 'i7JuI8WcwN94blNMb';
const MIN_FOLLOWERS = 5000;
const MAX_FOLLOWERS = 150000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const LANGUAGES = ['PT', 'ES', 'EN', 'DE', 'FR', 'IT'];

// Cache em memória
const memoryCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Gemini setup
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const modelPrimary = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
const modelFallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ============================================
// CACHE
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
// RETRY
// ============================================
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

// ============================================
// APIFY
// ============================================
async function runApifyActor(actorId: string, input: any): Promise<any[]> {
  // Start actor
  const startRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!startRes.ok) throw new Error('Failed to start actor');
  
  const { data: { id: runId, defaultDatasetId } } = await startRes.json();
  
  // Wait for completion (max 120s)
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

async function scrapeFollowing(handle: string, count: number): Promise<string[]> {
  const key = getCacheKey(handle, 'following');
  const cached = getFromCache(key);
  if (cached) return cached;

  const data = await withRetry(() => runApifyActor(ACTOR_FOLLOWING, {
    profiles: [handle],
    resultsPerPage: Math.min(count, 200),
    followers: 0,
    following: count
  }));

  const handles = [...new Set(data?.filter((i: any) => i.authorMeta?.name).map((i: any) => i.authorMeta.name) || [])];
  setCache(key, handles);
  return handles;
}

// ============================================
// GEMINI
// ============================================
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

// ============================================
// DATABASE
// ============================================
async function getSeedFromDB(language: string) {
  const result = await prisma.$queryRaw`
    SELECT id, name, "tiktokHandle", "tiktokFollowers"
    FROM influencers
    WHERE language = ${language}
      AND "tiktokFollowers" BETWEEN ${MIN_FOLLOWERS} AND ${MAX_FOLLOWERS}
      AND status NOT IN ('BLACKLISTED', 'CANCELLED')
    ORDER BY RANDOM()
    LIMIT 1
  `;
  return Array.isArray(result) && result.length ? result[0] : null;
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

// ============================================
// MAIN API
// ============================================
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const { language, max = 50, seed, dryRun = false } = await request.json();

    // Validate
    if (!APIFY_TOKEN || !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing API tokens' }, { status: 500 });
    }

    if (!LANGUAGES.includes(language?.toUpperCase())) {
      return NextResponse.json({ error: `Invalid language. Use: ${LANGUAGES.join(', ')}` }, { status: 400 });
    }

    if (max < 1 || max > 50) {
      return NextResponse.json({ error: 'Max must be 1-50' }, { status: 400 });
    }

    // 1. GET SEED
    let seedData;
    if (seed) {
      seedData = { name: seed, tiktokHandle: seed, tiktokFollowers: 0 };
    } else {
      seedData = await getSeedFromDB(language.toUpperCase());
      if (!seedData) {
        return NextResponse.json({ error: `No seed found for language ${language}` }, { status: 404 });
      }
    }

    logger.info(`[PROSPECTOR] Starting with seed: ${seedData.name}`);

    // 2. SCRAP SEED PROFILE
    let seedProfile;
    try {
      seedProfile = await scrapeProfile(seedData.tiktokHandle);
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to scrape seed: ${err.message}` }, { status: 500 });
    }

    const followingCount = seedProfile[0]?.authorMeta?.following || 0;
    if (!followingCount) {
      return NextResponse.json({ error: 'Seed has no visible following' }, { status: 400 });
    }

    // 3. SCRAP FOLLOWING
    let handles;
    try {
      handles = await scrapeFollowing(seedData.tiktokHandle, followingCount);
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to scrape following: ${err.message}` }, { status: 500 });
    }

    if (!handles.length) {
      return NextResponse.json({ error: 'No following found' }, { status: 404 });
    }

    // 4. PROCESS EACH (THE "WEB" SYSTEM)
    let processed = 0, imported = 0, skipped = 0, failed = 0;
    const results: any[] = [];

    for (const handle of handles) {
      if (processed >= max) break;

      // Check duplicate
      if (await handleExistsInDB(handle)) {
        skipped++;
        continue;
      }

      try {
        // Scrap profile
        let profile;
        try {
          profile = await scrapeProfile(handle);
        } catch {
          skipped++;
          continue;
        }

        // Validate
        const validation = await validateProfile(handle, profile);
        if (!validation.valid) {
          skipped++;
          continue;
        }

        // Calculate engagement
        const engagement = calculateEngagement(profile);

        // Analyze with Gemini
        const analysis = await analyzeFit(handle, profile, engagement);

        if (analysis.fitScore < 3) {
          skipped++;
          continue;
        }

        // Insert (if not dry run)
        if (!dryRun) {
          const author = profile[0]?.authorMeta;
          await prisma.influencer.create({
            data: {
              name: author?.nickName || handle,
              tiktokHandle: `@${handle}`,
              tiktokFollowers: author?.fans || 0,
              engagementRate: engagement,
              country: analysis.country,
              language: language.toUpperCase(),
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
        results.push({ handle, fitScore: analysis.fitScore, niche: analysis.niche });

      } catch (err: any) {
        failed++;
      }

      processed++;
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    // 5. RETURN RESULTS
    return NextResponse.json({
      success: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      stats: {
        language: language.toUpperCase(),
        seed: seedData.tiktokHandle,
        processed,
        imported,
        skipped,
        failed,
        mode: dryRun ? 'DRY RUN' : 'PRODUCTION'
      },
      results
    });

  } catch (error: any) {
    logger.error('[PROSPECTOR] Fatal error', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
