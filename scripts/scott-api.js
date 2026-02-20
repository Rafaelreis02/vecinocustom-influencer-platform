#!/usr/bin/env node
/**
 * 🤖 SCOTT - Agente de Prospecção Vecino (API Edition)
 * 
 * VERSÃO: 2.0 (Substitui analisar_importar_local.js)
 * DATA: 2026-02-20
 * 
 * MUDANÇAS:
 * - Agora usa a API oficial em vez de código duplicado
 * - Beneficia de cache automático (poupa $ em análises repetidas)
 * - Logs centralizados na plataforma
 * - Autenticação segura via API Key
 * 
 * INSTALAÇÃO:
 * 1. Criar .env com SCOTT_API_TOKEN (fornecido pelo Tech)
 * 2. npm install node-fetch@2 (se ainda não tiver)
 * 3. node scripts/scott-api.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  API_BASE: process.env.VECINO_API_URL || 'https://vecinocustom-influencer-platform.vercel.app',
  API_TOKEN: process.env.SCOTT_API_TOKEN, // Guardado no 1Password
  CACHE_FILE: path.join(__dirname, '..', 'cache', 'scott-cache.json'),
  RATE_LIMIT_MS: 2000, // 2s entre pedidos (gentle)
  MAX_RETRIES: 3,
};

// Verificar config
if (!CONFIG.API_TOKEN) {
  console.error('❌ SCOTT_API_TOKEN não definido no .env');
  console.error('   Pede ao Tech para gerar uma API key');
  process.exit(1);
}

// ============================================
// CACHE LOCAL (para evitar duplicados na mesma sessão)
// ============================================

function loadLocalCache() {
  try {
    if (fs.existsSync(CONFIG.CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.CACHE_FILE, 'utf8'));
    }
  } catch {
    // Ignora erros de cache
  }
  return {};
}

function saveLocalCache(cache) {
  try {
    const dir = path.dirname(CONFIG.CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG.CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // Silent fail
  }
}

const localCache = loadLocalCache();

// ============================================
// API CLIENT
// ============================================

async function callApi(endpoint, method = 'GET', body = null, retryCount = 0) {
  const url = `${CONFIG.API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CONFIG.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    
    return data;
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`   🔄 Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES}...`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return callApi(endpoint, method, body, retryCount + 1);
    }
    throw error;
  }
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Analisa um influencer via API
 * Retorna dados completos (Apify + Gemini)
 */
async function analisarInfluencer(handle, platform = 'TIKTOK', dryRun = false) {
  const cacheKey = `${platform}:${handle.toLowerCase()}`;
  
  // Verifica cache local primeiro
  if (localCache[cacheKey] && !dryRun) {
    console.log(`   💾 Cache local: @${handle}`);
    return localCache[cacheKey];
  }
  
  console.log(`   🔍 A analisar @${handle}...`);
  
  const result = await callApi('/api/worker/analyze-influencer', 'POST', {
    handle,
    platform,
    dryRun,
  });
  
  // Guarda no cache local (para esta sessão)
  if (!dryRun) {
    localCache[cacheKey] = result;
    saveLocalCache(localCache);
  }
  
  // Indica se veio do cache da API
  if (result.fromCache) {
    console.log(`   ✅ Resultado do cache (API) - Grátis!`);
  } else {
    console.log(`   ✅ Análise completa (Fit: ${result.fitScore}/5)`);
  }
  
  return result;
}

/**
 * Importa um influencer para a base de dados
 * (Cria na DB via API pública de influencers)
 */
async function importarInfluencer(handle, platform = 'TIKTOK') {
  // 1. Analisa
  const analysis = await analisarInfluencer(handle, platform);
  
  // 2. Cria na DB
  console.log(`   💾 A importar @${handle}...`);
  
  const influencerData = {
    name: analysis.name || handle,
    tiktokHandle: platform === 'TIKTOK' ? handle : '',
    instagramHandle: platform === 'INSTAGRAM' ? handle : '',
    tiktokFollowers: platform === 'TIKTOK' ? analysis.followers : null,
    instagramFollowers: platform === 'INSTAGRAM' ? analysis.followers : null,
    avatarUrl: analysis.avatar,
    engagementRate: analysis.engagement,
    averageViews: analysis.averageViews,
    biography: analysis.biography,
    verified: analysis.verified,
    videoCount: analysis.videoCount,
    estimatedPrice: analysis.estimatedPrice,
    fitScore: analysis.fitScore,
    niche: analysis.niche,
    tier: analysis.tier,
    status: 'SUGGESTION', // Scott cria como sugestão
    notes: `[SCOTT ANALYSIS]\n\n${analysis.summary}\n\nPontos Fortes:\n${analysis.strengths?.map(s => `• ${s}`).join('\n') || 'N/A'}\n\nOportunidades:\n${analysis.opportunities?.map(o => `• ${o}`).join('\n') || 'N/A'}`,
    country: analysis.country,
    language: 'PT',
    primaryPlatform: platform,
  };
  
  const created = await callApi('/api/influencers', 'POST', influencerData);
  
  console.log(`   ✅ Importado! ID: ${created.id}`);
  return created;
}

/**
 * Analisa uma lista de prospects
 */
async function analisarLista(prospects) {
  console.log(`\n🕸️ SCOTT - Análise de ${prospects.length} prospects\n`);
  
  const results = [];
  
  for (let i = 0; i < prospects.length; i++) {
    const { handle, platform } = prospects[i];
    console.log(`\n[${i + 1}/${prospects.length}] @${handle}`);
    
    try {
      const result = await analisarInfluencer(handle, platform);
      results.push({ handle, success: true, data: result });
      
      // Recomendação
      if (result.fitScore >= 4) {
        console.log(`   🎯 RECOMENDAÇÃO: CONTACTAR!`);
      } else if (result.fitScore >= 3) {
        console.log(`   🤔 RECOMENDAÇÃO: Validar mais`);
      } else {
        console.log(`   ❌ RECOMENDAÇÃO: Skip`);
      }
      
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
      results.push({ handle, success: false, error: error.message });
    }
    
    // Rate limiting gentil
    if (i < prospects.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_MS));
    }
  }
  
  // Resumo
  console.log(`\n📊 RESUMO:`);
  console.log(`   Total: ${prospects.length}`);
  console.log(`   Sucesso: ${results.filter(r => r.success).length}`);
  console.log(`   Erros: ${results.filter(r => !r.success).length}`);
  console.log(`   Fit ≥4: ${results.filter(r => r.success && r.data.fitScore >= 4).length}`);
  
  return results;
}

// ============================================
// EXEMPLOS DE USO
// ============================================

async function main() {
  console.log('🤖 SCOTT v2.0 - API Edition');
  console.log('=============================\n');
  
  // EXEMPLO 1: Analisar um só influencer (dry run = só vê, não cria)
  // const resultado = await analisarInfluencer('giuliaconti.ch', 'TIKTOK', true);
  // console.log(resultado);
  
  // EXEMPLO 2: Importar um influencer (cria na DB)
  // const importado = await importarInfluencer('giuliaconti.ch', 'TIKTOK');
  
  // EXEMPLO 3: Analisar lista
  const prospects = [
    { handle: 'giuliaconti.ch', platform: 'TIKTOK' },
    { handle: 'sofiarossi', platform: 'TIKTOK' },
    { handle: 'mariasilva', platform: 'TIKTOK' },
  ];
  
  await analisarLista(prospects);
  
  console.log('\n✨ Done!');
}

// Se correr diretamente
if (require.main === module) {
  main().catch(console.error);
}

// Exporta para uso em outros scripts
module.exports = {
  analisarInfluencer,
  importarInfluencer,
  analisarLista,
};
