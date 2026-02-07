#!/usr/bin/env node

/**
 * Cronjob: Process Pending Influencers
 * 
 * Este script verifica se há influencers com status IMPORT_PENDING
 * e chama o endpoint /api/worker/process para processá-los com Claude.
 * 
 * Uso:
 *   node scripts/process-pending-influencers.js
 * 
 * Cron (a cada 2 minutos):
 *   */2 * * * * cd /path/to/vecinocustom-app && node scripts/process-pending-influencers.js
 * 
 * Vercel Cron:
 *   Adicionar em vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/process-influencers",
 *       "schedule": "*/2 * * * *"
 *     }]
 *   }
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('[CRON] Verificando influencers pendentes...');
  
  try {
    // 1. Verificar se há pendentes
    const checkRes = await fetch(`${BASE_URL}/api/worker/pending`);
    const checkData = await checkRes.json();
    
    if (!checkData.found) {
      console.log('[CRON] ✅ Nenhum influencer pendente.');
      return;
    }
    
    console.log(`[CRON] 📋 Encontrado: ${checkData.task.name} (@${checkData.task.tiktokHandle || checkData.task.instagramHandle})`);
    
    // 2. Processar
    console.log('[CRON] 🤖 Chamando Claude para análise...');
    const processRes = await fetch(`${BASE_URL}/api/worker/process`, {
      method: 'POST'
    });
    
    const processData = await processRes.json();
    
    if (processData.success) {
      console.log(`[CRON] ✅ Processado com sucesso: ${processData.influencer.name}`);
      console.log(`[CRON] 📊 Fit Score: ${processData.influencer.fitScore}/5`);
      console.log(`[CRON] 💰 Preço Estimado: €${processData.influencer.estimatedPrice}`);
    } else {
      console.error(`[CRON] ❌ Erro: ${processData.error || processData.message}`);
    }
    
  } catch (error) {
    console.error('[CRON] ❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
