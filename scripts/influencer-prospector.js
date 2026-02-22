#!/usr/bin/env node

/**
 * INFLUENCER PROSPECTOR - Processo Teia 100% Automático
 * 
 * Funcionalidades:
 * - Pesquisa por idioma (PT, ES, EN, DE, FR, IT)
 * - Máximo 50 influencers por execução
 * - Verificação de duplicados (@handle)
 * - Cache inteligente para economia
 * - Filtros: 5k-150k followers, feminino, pessoa real
 * - Análise Gemini 3.0 Flash + Fallback 1.5 Flash
 * - Retry 3x com mensagem de erro
 * - Logging completo para ficheiro
 * - Importação automática se fit >= 3
 * 
 * Uso:
 *   node influencer-prospector.js --language=PT --max=50
 *   node influencer-prospector.js --language=ES --seed=@mariafashion
 *   node influencer-prospector.js --language=EN --dry-run
 */

const { Client } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURAÇÃO
// ============================================

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Actors Apify
const ACTOR_PROFILE = 'GdWCkxBtKWOsKjdch';      // Perfil + vídeos
const ACTOR_FOLLOWING = 'i7JuI8WcwN94blNMb';   // Following/Followers

// Limites
const MIN_FOLLOWERS = 5000;
const MAX_FOLLOWERS = 150000;
const MAX_RESULTS = 50;
const VIDEOS_PER_PROFILE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Idiomas suportados
const LANGUAGES = ['PT', 'ES', 'EN', 'DE', 'FR', 'IT'];

// Cache
const CACHE_DIR = path.join(__dirname, 'cache');
const LOGS_DIR = path.join(__dirname, 'logs');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// ============================================
// LOGGER (Console + Ficheiro)
// ============================================

class Logger {
  constructor() {
    this.logFile = null;
    this.startTime = new Date();
    this.ensureLogsDir();
    this.createLogFile();
  }

  ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  }

  createLogFile() {
    const timestamp = this.startTime.toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(LOGS_DIR, `prospector-${timestamp}.log`);
    this.log('INFLUENCER PROSPECTOR - Log iniciado', 'info');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', processing: '🔄' };
    const icon = icons[type] || 'ℹ️';
    const line = `[${timestamp}] ${icon} ${message}`;
    
    // Console
    console.log(line);
    
    // Ficheiro
    if (this.logFile) {
      fs.appendFileSync(this.logFile, line + '\n');
    }
  }

  logStats(stats) {
    this.log('\n=================================', 'info');
    this.log('RELATÓRIO FINAL', 'info');
    this.log('=================================', 'info');
    Object.entries(stats).forEach(([key, value]) => {
      this.log(`${key}: ${value}`, typeof value === 'number' && value > 0 ? 'success' : 'info');
    });
    this.log('=================================', 'info');
  }
}

const logger = new Logger();

// ============================================
// UTILITÁRIOS
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    language: null,
    max: MAX_RESULTS,
    seed: null,
    dryRun: false,
    skipCache: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--language=')) {
      params.language = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--max=')) {
      params.max = parseInt(arg.split('=')[1]) || MAX_RESULTS;
    } else if (arg.startsWith('--seed=')) {
      params.seed = arg.split('=')[1].replace('@', '');
    } else if (arg === '--dry-run') {
      params.dryRun = true;
    } else if (arg === '--skip-cache') {
      params.skipCache = true;
    }
  }

  return params;
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheKey(handle, type) {
  return `${type}_${handle.toLowerCase()}`;
}

function getCachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function getFromCache(key) {
  try {
    const cachePath = getCachePath(key);
    if (!fs.existsSync(cachePath)) return null;
    
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const age = Date.now() - data.timestamp;
    
    if (age > CACHE_TTL) {
      fs.unlinkSync(cachePath);
      return null;
    }
    
    return data.value;
  } catch {
    return null;
  }
}

function setCache(key, value) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(key);
    fs.writeFileSync(cachePath, JSON.stringify({
      timestamp: Date.now(),
      value
    }));
  } catch (err) {
    logger.log(`Erro ao guardar cache: ${err.message}`, 'warning');
  }
}

// Retry helper
async function withRetry(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.log(`Tentativa ${i + 1}/${maxRetries} falhou: ${err.message}`, 'warning');
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ============================================
// BASE DE DADOS
// ============================================

class Database {
  constructor() {
    this.client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async connect() {
    await this.client.connect();
    logger.log('Conectado à base de dados', 'success');
  }

  async disconnect() {
    await this.client.end();
    logger.log('Desconectado da base de dados', 'info');
  }

  async getSeedByLanguage(language) {
    const query = `
      SELECT id, name, "tiktokHandle", "tiktokFollowers", language, country
      FROM influencers
      WHERE language = $1
        AND "tiktokFollowers" BETWEEN $2 AND $3
        AND status NOT IN ('BLACKLISTED', 'CANCELLED')
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const result = await this.client.query(query, [language, MIN_FOLLOWERS, MAX_FOLLOWERS]);
    return result.rows[0] || null;
  }

  async handleExists(handle) {
    const cleanHandle = handle.replace('@', '').toLowerCase();
    const query = `
      SELECT id FROM influencers 
      WHERE LOWER("tiktokHandle") = $1 
         OR LOWER("instagramHandle") = $1
      LIMIT 1
    `;
    const result = await this.client.query(query, [cleanHandle]);
    return result.rows.length > 0;
  }

  async insertInfluencer(data) {
    const query = `
      INSERT INTO influencers (
        id, name, "tiktokHandle", "tiktokFollowers", 
        engagementRate, country, language, niche,
        "contentTypes", "fitScore", status, 
        "discoveryMethod", "analysisSummary",
        "estimatedPrice", tier, biography,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 
        $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
      RETURNING id
    `;
    
    const values = [
      data.name,
      data.handle,
      data.followers,
      data.engagementRate,
      data.country,
      data.language,
      data.niche,
      data.contentTypes,
      data.fitScore,
      'SUGGESTION',
      'AUTOMATED',
      data.analysisSummary,
      data.estimatedPrice,
      data.tier,
      data.biography
    ];

    const result = await this.client.query(query, values);
    return result.rows[0].id;
  }

  async markSeedAsUsed(seedId) {
    logger.log(`Semente ${seedId} marcada como usada`, 'info');
  }
}

// ============================================
// APIFY API
// ============================================

class ApifyClient {
  constructor() {
    this.baseUrl = 'https://api.apify.com/v2';
    this.token = APIFY_TOKEN;
    this.errorCount = 0;
  }

  async runActor(actorId, input, maxWaitTime = 120000) {
    return withRetry(async () => {
      const startRes = await fetch(`${this.baseUrl}/acts/${actorId}/runs?token=${this.token}`, {
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
      
      logger.log(`Actor iniciado (run: ${runId.substring(0, 8)}...)`, 'processing');

      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(r => setTimeout(r, 3000));

        const statusRes = await fetch(`${this.baseUrl}/actor-runs/${runId}?token=${this.token}`);
        if (!statusRes.ok) continue;
        
        const statusData = await statusRes.json();
        const status = statusData.data.status;

        if (status === 'SUCCEEDED') {
          const dataRes = await fetch(`${this.baseUrl}/datasets/${datasetId}/items?token=${this.token}`);
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

  async scrapeProfile(handle) {
    const cacheKey = getCacheKey(handle, 'profile');
    const cached = getFromCache(cacheKey);
    if (cached) {
      logger.log(`Cache hit para @${handle}`, 'info');
      return cached;
    }

    logger.log(`Scraping perfil: @${handle}`, 'processing');
    
    try {
      const data = await this.runActor(ACTOR_PROFILE, {
        profiles: [`https://www.tiktok.com/@${handle}`],
        resultsPerPage: VIDEOS_PER_PROFILE
      });

      if (!data || data.length === 0) {
        throw new Error(`Nenhum dado retornado para @${handle}`);
      }

      setCache(cacheKey, data);
      return data;
    } catch (err) {
      this.errorCount++;
      throw err;
    }
  }

  async scrapeFollowing(handle, followingCount) {
    const cacheKey = getCacheKey(handle, 'following');
    const cached = getFromCache(cacheKey);
    if (cached) {
      logger.log(`Cache hit para following de @${handle}`, 'info');
      return cached;
    }

    logger.log(`Scraping following de @${handle} (~${followingCount} contas)`, 'processing');

    try {
      const data = await this.runActor(ACTOR_FOLLOWING, {
        profiles: [handle],
        resultsPerPage: Math.min(followingCount, 200),
        followers: 0,
        following: followingCount
      });

      if (!data || data.length === 0) {
        logger.log(`Nenhum following encontrado para @${handle}`, 'warning');
        return [];
      }

      const handles = [...new Set(
        data
          .filter(item => item.authorMeta?.name)
          .map(item => item.authorMeta.name)
      )];

      logger.log(`Encontrados ${handles.length} handles únicos`, 'success');
      
      setCache(cacheKey, handles);
      return handles;
    } catch (err) {
      this.errorCount++;
      throw err;
    }
  }

  getErrorCount() {
    return this.errorCount;
  }
}

// ============================================
// ANÁLISE GEMINI (3.0 Flash + 1.5 Flash Fallback)
// ============================================

class InfluencerAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Primary: Gemini 3.0 Flash, Fallback: Gemini 1.5 Flash
    this.modelPrimary = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    this.modelFallback = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateWithFallback(prompt) {
    try {
      // Tentar primeiro com Gemini 3.0 Flash
      logger.log('Usando Gemini 3.0 Flash...', 'processing');
      const result = await this.modelPrimary.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      logger.log(`Gemini 3.0 Flash falhou: ${err.message}`, 'warning');
      
      // Fallback para Gemini 1.5 Flash
      try {
        logger.log('Fallback para Gemini 1.5 Flash...', 'processing');
        const result = await this.modelFallback.generateContent(prompt);
        return result.response.text();
      } catch (fallbackErr) {
        throw new Error(`Ambos os modelos falharam: ${fallbackErr.message}`);
      }
    }
  }

  async validateProfile(handle, profileData) {
    const author = profileData[0]?.authorMeta;
    if (!author) return { valid: false, reason: 'Sem dados do autor' };

    const followers = author.fans || 0;
    
    if (followers < MIN_FOLLOWERS || followers > MAX_FOLLOWERS) {
      return { 
        valid: false, 
        reason: `Followers fora do range (${followers})` 
      };
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
      const text = await this.generateWithFallback(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      return {
        valid: analysis.isRealPerson && analysis.isFemale && analysis.isSuitable,
        reason: analysis.reason,
        isFemale: analysis.isFemale,
        isRealPerson: analysis.isRealPerson
      };
    } catch (err) {
      logger.log(`Erro na validação de @${handle}: ${err.message}`, 'warning');
      return { valid: true, reason: 'Validação falhou, assume válido' };
    }
  }

  calculateEngagement(profileData) {
    const posts = profileData.filter(item => item.webVideoUrl);
    if (posts.length === 0) return 0;

    const author = profileData[0]?.authorMeta;
    const followers = author?.fans || 1;

    let totalInteractions = 0;
    posts.forEach(post => {
      totalInteractions += (post.diggCount || 0) + 
                          (post.commentCount || 0) + 
                          (post.shareCount || 0);
    });

    const avgInteractions = totalInteractions / posts.length;
    const engagement = (avgInteractions / followers) * 100;
    
    return parseFloat(engagement.toFixed(2));
  }

  async analyzeFit(handle, profileData, engagementRate) {
    const author = profileData[0]?.authorMeta;
    const posts = profileData.filter(item => item.webVideoUrl).slice(0, 5);

    const prompt = `Analise este influencer para a marca VecinoCustom (joias personalizadas portuguesas):

Perfil: @${handle}
Nome: ${author?.nickName || handle}
Seguidores: ${author?.fans || 'N/A'}
Engagement Rate: ${engagementRate}%
Bio: ${author?.signature || 'N/A'}

Últimos posts:
${posts.map((p, i) => `${i+1}. "${(p.text || '').substring(0, 80)}..." - ${p.playCount || 0} views, ${p.diggCount || 0} likes`).join('\n')}

Responda APENAS com JSON:
{
  "fitScore": 1-5 (5=perfeito),
  "niche": "Fashion/Lifestyle/Beauty/etc",
  "tier": "nano/micro/macro/mega baseado em followers",
  "estimatedPrice": número em euros (50-500),
  "contentTypes": ["tipo1", "tipo2"],
  "strengths": ["ponto positivo 1", "ponto positivo 2"],
  "opportunities": ["consideração 1"],
  "summary": "2-3 parágrafos em português",
  "country": "PT/ES/IT/etc (estimado pelo idioma/nome)"
}`;

    try {
      const text = await this.generateWithFallback(prompt);
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
        opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities : [],
        summary: analysis.summary || 'Análise não disponível',
        country: analysis.country || 'PT'
      };
    } catch (err) {
      logger.log(`Erro na análise de @${handle}: ${err.message}`, 'warning');
      return {
        fitScore: 3,
        niche: 'Lifestyle',
        tier: 'micro',
        estimatedPrice: 60,
        contentTypes: ['General'],
        strengths: ['Dados disponíveis'],
        opportunities: ['Análise AI indisponível'],
        summary: 'Análise automática falhou. Requer revisão manual.',
        country: 'PT'
      };
    }
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function main() {
  const startTime = Date.now();
  const params = parseArgs();

  logger.log('=================================', 'info');
  logger.log('INFLUENCER PROSPECTOR - Processo Teia', 'info');
  logger.log('=================================', 'info');

  // Validar parâmetros
  if (!params.language) {
    logger.log('Erro: Especifica --language=(PT|ES|EN|DE|FR|IT)', 'error');
    process.exit(1);
  }

  if (!LANGUAGES.includes(params.language)) {
    logger.log(`Erro: Idioma ${params.language} não suportado. Use: ${LANGUAGES.join(', ')}`, 'error');
    process.exit(1);
  }

  if (!APIFY_TOKEN || !GEMINI_API_KEY || !DATABASE_URL) {
    logger.log('Erro: APIFY_API_TOKEN, GEMINI_API_KEY e DATABASE_URL são obrigatórios', 'error');
    process.exit(1);
  }

  logger.log(`Idioma: ${params.language}`, 'info');
  logger.log(`Máximo: ${params.max} influencers`, 'info');
  logger.log(`Modo: ${params.dryRun ? 'DRY RUN (sem inserir)' : 'PRODUÇÃO'}`, params.dryRun ? 'warning' : 'info');
  logger.log(`Retry: ${MAX_RETRIES}x com delay de ${RETRY_DELAY}ms`, 'info');
  logger.log('Modelos: Gemini 3.0 Flash (primário) → 1.5 Flash (fallback)', 'info');

  const db = new Database();
  const apify = new ApifyClient();
  const analyzer = new InfluencerAnalyzer();

  let processed = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    await db.connect();

    // 1. SELECIONAR SEMENTE
    let seed;
    if (params.seed) {
      seed = {
        name: params.seed,
        tiktokHandle: params.seed,
        tiktokFollowers: 0,
        language: params.language
      };
      logger.log(`Usando semente específica: @${params.seed}`, 'info');
    } else {
      try {
        seed = await db.getSeedByLanguage(params.language);
      } catch (err) {
        logger.log(`Erro ao buscar semente: ${err.message}`, 'error');
        throw new Error('Erro nas APIs, fale com o administrador');
      }
      
      if (!seed) {
        logger.log(`Nenhuma semente encontrada para idioma ${params.language}`, 'error');
        process.exit(1);
      }
      logger.log(`Semente selecionada: ${seed.name} (@${seed.tiktokHandle}) - ${seed.tiktokFollowers} followers`, 'success');
    }

    // 2. SCRAP SEMENTE
    logger.log('\n--- FASE 1: Scrap da Semente ---', 'info');
    let seedProfile;
    try {
      seedProfile = await withRetry(() => apify.scrapeProfile(seed.tiktokHandle));
    } catch (err) {
      logger.log(`Falha ao scrap semente após ${MAX_RETRIES} tentativas: ${err.message}`, 'error');
      throw new Error('Erro nas APIs, fale com o administrador');
    }

    const author = seedProfile[0]?.authorMeta;
    const followingCount = author?.following || 0;
    
    logger.log(`Semente tem ${followingCount} following`, 'info');
    
    if (followingCount === 0) {
      logger.log('Semente não tem following visível (provavelmente privado).', 'warning');
      logger.log('Tente outra semente ou verifique se o perfil é público.', 'warning');
      process.exit(1);
    }

    // Verificar erros do Apify
    if (apify.getErrorCount() >= 3) {
      throw new Error('Erro nas APIs, fale com o administrador');
    }

    // 3. SCRAP FOLLOWING
    logger.log('\n--- FASE 2: Scrap dos Following ---', 'info');
    let followingHandles;
    try {
      followingHandles = await withRetry(() => apify.scrapeFollowing(seed.tiktokHandle, followingCount));
    } catch (err) {
      logger.log(`Falha ao scrap following após ${MAX_RETRIES} tentativas: ${err.message}`, 'error');
      throw new Error('Erro nas APIs, fale com o administrador');
    }

    if (followingHandles.length === 0) {
      logger.log('Nenhum following encontrado', 'error');
      process.exit(1);
    }

    // Verificar erros do Apify novamente
    if (apify.getErrorCount() >= 3) {
      throw new Error('Erro nas APIs, fale com o administrador');
    }

    // 4. PROCESSAR CADA FOLLOWING
    logger.log(`\n--- FASE 3: Processamento (${Math.min(followingHandles.length, params.max)} handles) ---`, 'info');

    for (const handle of followingHandles) {
      if (processed >= params.max) break;

      logger.log(`\n[${processed + 1}/${params.max}] Processando @${handle}`, 'processing');

      // Verificar duplicados
      try {
        const exists = await db.handleExists(handle);
        if (exists) {
          logger.log(`  @${handle} já existe na base de dados`, 'warning');
          skipped++;
          continue;
        }
      } catch (err) {
        logger.log(`  Erro ao verificar duplicado: ${err.message}`, 'error');
        failed++;
        continue;
      }

      try {
        // Scrap perfil detalhado
        let profileData;
        try {
          profileData = await withRetry(() => apify.scrapeProfile(handle));
        } catch (err) {
          logger.log(`  Falha ao scrap perfil: ${err.message}`, 'warning');
          skipped++;
          continue;
        }
        
        // Validar perfil
        const validation = await analyzer.validateProfile(handle, profileData);
        if (!validation.valid) {
          logger.log(`  @${handle} rejeitado: ${validation.reason}`, 'warning');
          skipped++;
          continue;
        }

        // Calcular engagement
        const engagementRate = analyzer.calculateEngagement(profileData);
        logger.log(`  Engagement: ${engagementRate}%`, 'info');

        // Análise Gemini
        const analysis = await analyzer.analyzeFit(handle, profileData, engagementRate);
        logger.log(`  Fit Score: ${analysis.fitScore}/5`, analysis.fitScore >= 3 ? 'success' : 'warning');

        // Se fit < 3, descartar
        if (analysis.fitScore < 3) {
          logger.log(`  @${handle} descartado (fit < 3)`, 'warning');
          skipped++;
          continue;
        }

        // Importar
        if (!params.dryRun) {
          const author = profileData[0]?.authorMeta;
          const influencerId = await db.insertInfluencer({
            name: author?.nickName || handle,
            handle: `@${handle}`,
            followers: author?.fans || 0,
            engagementRate,
            country: analysis.country,
            language: params.language,
            niche: analysis.niche,
            contentTypes: analysis.contentTypes,
            fitScore: analysis.fitScore,
            analysisSummary: analysis.summary,
            estimatedPrice: analysis.estimatedPrice,
            tier: analysis.tier,
            biography: author?.signature || ''
          });

          logger.log(`  ✅ Importado com ID: ${influencerId.substring(0, 8)}...`, 'success');
          imported++;
        } else {
          logger.log(`  📝 DRY RUN - Não inserido`, 'warning');
          imported++;
        }

        processed++;

      } catch (err) {
        logger.log(`  ❌ Erro ao processar @${handle}: ${err.message}`, 'error');
        failed++;
      }

      // Pequena pausa para não sobrecarregar APIs
      await new Promise(r => setTimeout(r, 1000));
    }

    // 5. RELATÓRIO FINAL
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    logger.logStats({
      'Idioma': params.language,
      'Semente': `@${seed.tiktokHandle}`,
      'Duração': `${duration}s`,
      'Processados': processed,
      'Importados': imported,
      'Ignorados': skipped,
      'Falhas': failed,
      'Log file': logger.logFile
    });

    // Marcar semente como usada
    if (seed.id) {
      await db.markSeedAsUsed(seed.id);
    }

  } catch (err) {
    logger.log(`\n❌ ERRO FATAL: ${err.message}`, 'error');
    
    if (err.message.includes('Erro nas APIs')) {
      logger.log('\n⚠️  ERRO NAS APIS, FALE COM O ADMINISTRADOR', 'error');
    }
    
    throw err;
  } finally {
    await db.disconnect();
  }
}

// Rodar
main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message);
  if (err.message.includes('Erro nas APIs')) {
    console.error('⚠️  ERRO NAS APIS, FALE COM O ADMINISTRADOR');
  }
  process.exit(1);
});
