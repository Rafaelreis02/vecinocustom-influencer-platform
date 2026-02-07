#!/usr/bin/env node

/**
 * OpenClaw Worker - Process Pending Influencers with Real Browser Data
 * 
 * Este script roda LOCALMENTE (onde o OpenClaw Gateway está)
 * e processa influencers usando o browser para dados reais.
 * 
 * Uso:
 *   node scripts/openclaw-worker.js
 * 
 * Cron (a cada 5 minutos):
 *   (cron expression) cd /path/to/workspace && node scripts/openclaw-worker.js
 * 
 * Windows Task Scheduler:
 *   Trigger: Every 5 minutes
 *   Action: node.exe C:\path\to\workspace\scripts\openclaw-worker.js
 */

const VERCEL_BASE_URL = process.env.VERCEL_BASE_URL || 'https://vecinocustom-influencer-platform.vercel.app';
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

async function main() {
  console.log('[WORKER] 🤖 OpenClaw Worker started');
  console.log(`[WORKER] Vercel: ${VERCEL_BASE_URL}`);
  console.log(`[WORKER] OpenClaw: ${OPENCLAW_GATEWAY}`);
  
  try {
    // 1. Verificar se há influencers pendentes
    console.log('[WORKER] 🔍 Checking for pending influencers...');
    
    const checkRes = await fetch(`${VERCEL_BASE_URL}/api/worker/pending`);
    const checkData = await checkRes.json();
    
    if (!checkData.found) {
      console.log('[WORKER] ✅ No pending influencers. All done!');
      return;
    }
    
    const influencer = checkData.task;
    const handle = influencer.tiktokHandle || influencer.instagramHandle;
    const platform = influencer.tiktokHandle ? 'TikTok' : 'Instagram';
    
    console.log(`[WORKER] 📋 Found: ${influencer.name} (@${handle}) - ${platform}`);
    
    if (platform !== 'TikTok') {
      console.log('[WORKER] ⚠️  Instagram not supported yet. Skipping.');
      return;
    }
    
    // 2. Scrape dados reais via Browser
    console.log(`[WORKER] 🌐 Opening browser for @${handle}...`);
    
    const profileUrl = `https://www.tiktok.com/@${handle}`;
    
    // Abrir no browser OpenClaw
    const openRes = await fetch(`${OPENCLAW_GATEWAY}/browser/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: profileUrl,
        profile: 'openclaw'
      })
    });
    
    if (!openRes.ok) {
      throw new Error(`Failed to open browser: ${openRes.statusText}`);
    }
    
    const { targetId } = await openRes.json();
    console.log(`[WORKER] ✅ Browser opened (targetId: ${targetId})`);
    
    // Esperar carregar
    console.log('[WORKER] ⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. Tirar snapshot
    console.log('[WORKER] 📸 Capturing page snapshot...');
    const snapshotRes = await fetch(
      `${OPENCLAW_GATEWAY}/browser/snapshot?profile=openclaw&targetId=${targetId}`
    );
    
    if (!snapshotRes.ok) {
      throw new Error(`Failed to get snapshot: ${snapshotRes.statusText}`);
    }
    
    const snapshot = await snapshotRes.json();
    const pageText = snapshot.text || '';
    
    console.log(`[WORKER] ✅ Snapshot captured (${pageText.length} chars)`);
    
    // 4. Parse dados
    console.log('[WORKER] 🔬 Parsing profile data...');
    
    const data = parseProfileData(pageText, handle);
    console.log('[WORKER] 📊 Extracted data:', {
      name: data.name,
      followers: data.followers,
      likes: data.totalLikes,
      engagement: data.engagementRate
    });
    
    // 5. Enviar para API Vercel
    console.log('[WORKER] 📤 Updating database via API...');
    
    const updateRes = await fetch(`${VERCEL_BASE_URL}/api/influencers/${influencer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'suggestion',
        name: data.name,
        tiktokFollowers: data.followers,
        totalLikes: data.totalLikes,
        engagementRate: data.engagementRate,
        averageViews: data.averageViews,
        contentStability: data.contentStability,
        estimatedPrice: data.estimatedPrice,
        fitScore: data.fitScore,
        tier: data.tier,
        email: data.email,
        niche: data.niche,
        contentTypes: data.contentTypes,
        tags: data.tags,
        country: 'Portugal',
        language: 'PT',
        primaryPlatform: 'TikTok',
        notes: `✅ Dados REAIS extraídos via OpenClaw Browser em ${new Date().toLocaleString('pt-PT')}.\n\nBio: ${data.bio || 'N/A'}`
      })
    });
    
    if (updateRes.ok) {
      console.log('[WORKER] ✅ Successfully updated!');
      console.log('[WORKER] 💰 Estimated Price: €' + data.estimatedPrice);
      console.log('[WORKER] ⭐ Fit Score: ' + data.fitScore + '/5');
    } else {
      const error = await updateRes.text();
      console.error('[WORKER] ❌ Update failed:', error);
    }
    
  } catch (error) {
    console.error('[WORKER] ❌ Fatal error:', error.message);
    process.exit(1);
  }
}

/**
 * Parse profile data from TikTok page text
 */
function parseProfileData(pageText, handle) {
  // Nome
  const nameMatch = pageText.match(new RegExp(`${handle}\\s+([^\\n]+)`));
  const name = nameMatch ? nameMatch[1].trim() : handle;
  
  // Followers
  const followersMatch = pageText.match(/(\d+\.?\d*[KM]?)\s+Seguidores/i) ||
                         pageText.match(/(\d+\.?\d*[KM]?)\s+Followers/i);
  const followers = parseNumber(followersMatch ? followersMatch[1] : '0');
  
  // Total Likes
  const likesMatch = pageText.match(/(\d+\.?\d*[KM]?)\s+Gostos/i) ||
                     pageText.match(/(\d+\.?\d*[KM]?)\s+Likes/i);
  const totalLikes = parseNumber(likesMatch ? likesMatch[1] : '0');
  
  // Bio
  const bioMatch = pageText.match(new RegExp(`${name}[\\s\\S]{0,200}?([\\s\\S]{10,200}?)(?:\\d+\\s+A seguir|\\d+\\s+Following)`));
  const bio = bioMatch ? bioMatch[1].trim() : '';
  
  // Email
  const emailMatch = bio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  const email = emailMatch ? emailMatch[0] : null;
  
  // Vídeos recentes (views)
  const videoViewsRegex = /(\d+\.?\d*[KM]?)\s*▶/g;
  const videoViews = [];
  let match;
  while ((match = videoViewsRegex.exec(pageText)) !== null && videoViews.length < 10) {
    videoViews.push(parseNumber(match[1]));
  }
  
  // Average views
  const avgViews = videoViews.length > 0
    ? Math.round(videoViews.reduce((sum, v) => sum + v, 0) / videoViews.length)
    : 0;
  
  const averageViews = avgViews >= 1000000 ? `${(avgViews / 1000000).toFixed(1)}M`
                     : avgViews >= 1000 ? `${(avgViews / 1000).toFixed(1)}K`
                     : avgViews.toString();
  
  // Métricas calculadas
  const engagementRate = followers > 0 
    ? parseFloat(((totalLikes / (followers * 100)) * 100).toFixed(2))
    : 0;
  
  const contentStability = engagementRate >= 5 ? 'HIGH' 
                         : engagementRate >= 3 ? 'MEDIUM' 
                         : 'LOW';
  
  // Tier
  const tier = followers < 10000 ? 'nano'
             : followers < 100000 ? 'micro'
             : followers < 1000000 ? 'macro'
             : 'mega';
  
  // Preço estimado
  let basePrice = tier === 'nano' ? 50 
                : tier === 'micro' ? 150
                : tier === 'macro' ? 500
                : 1500;
  
  const engagementMultiplier = engagementRate >= 5 ? 1.5 
                             : engagementRate >= 3 ? 1.2 
                             : engagementRate >= 1 ? 1.0 
                             : 0.7;
  
  const estimatedPrice = Math.round(basePrice * engagementMultiplier);
  
  // Fit score
  let fitScore = 3;
  const bioLower = bio.toLowerCase();
  if (/fashion|moda|lifestyle|beauty|beleza|luxury|luxo/.test(bioLower)) fitScore += 1;
  if (engagementRate >= 5) fitScore += 1;
  else if (engagementRate < 2) fitScore -= 1;
  fitScore = Math.max(1, Math.min(5, fitScore));
  
  // Nicho e content types
  let niche = 'Lifestyle';
  let contentTypes = ['Content'];
  
  if (/fashion|moda/.test(bioLower)) {
    niche = 'Fashion';
    contentTypes = ['Hauls', 'OOTD', 'Fashion Tips'];
  } else if (/beauty|beleza/.test(bioLower)) {
    niche = 'Beauty';
    contentTypes = ['Makeup', 'Skincare', 'Reviews'];
  } else if (/lifestyle/.test(bioLower)) {
    contentTypes = ['Vlogs', 'Daily Life', 'Tips'];
  }
  
  // Tags
  const tags = [];
  if (/portugal|PT/.test(bio)) tags.push('portugal');
  if (/fashion/.test(bioLower)) tags.push('fashion');
  if (/beauty/.test(bioLower)) tags.push('beauty');
  if (/lifestyle/.test(bioLower)) tags.push('lifestyle');
  
  return {
    name,
    bio,
    followers,
    totalLikes,
    email,
    engagementRate,
    averageViews,
    contentStability,
    tier,
    estimatedPrice,
    fitScore,
    niche,
    contentTypes,
    tags
  };
}

/**
 * Converte "4.5K" → 4500, "1.2M" → 1200000
 */
function parseNumber(str) {
  if (!str) return 0;
  
  const cleaned = str.trim().toUpperCase();
  
  if (cleaned.includes('M')) {
    return Math.round(parseFloat(cleaned) * 1000000);
  }
  
  if (cleaned.includes('K')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  
  return parseInt(cleaned.replace(/[^0-9]/g, ''), 10) || 0;
}

main();
