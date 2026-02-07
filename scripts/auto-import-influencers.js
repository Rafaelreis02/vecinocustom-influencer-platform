#!/usr/bin/env node

/**
 * AUTO-IMPORT INFLUENCERS - 100% Automático + Dados Reais
 * 
 * Roda a cada 5 minutos via Windows Task Scheduler
 * Processa influencers pendentes com dados REAIS do TikTok
 */

const { execSync } = require('child_process');
const fs = require('fs');

const VERCEL_API = process.env.VERCEL_BASE_URL || 'https://vecinocustom-influencer-platform.vercel.app';
const LOG_FILE = __dirname + '/auto-import.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line);
}

async function main() {
  log('🤖 Auto-Import Started');
  
  try {
    // 1. Verificar influencers pendentes
    log('Checking for pending influencers...');
    const checkRes = await fetch(`${VERCEL_API}/api/worker/pending`);
    const checkData = await checkRes.json();
    
    if (!checkData.found) {
      log('✅ No pending influencers. Done!');
      return;
    }
    
    const influencer = checkData.task;
    const handle = (influencer.tiktokHandle || influencer.instagramHandle || '').replace('@', '');
    const platform = influencer.tiktokHandle ? 'TikTok' : 'Instagram';
    
    log(`📋 Found: ${influencer.name} (@${handle}) - ${platform}`);
    
    if (platform !== 'TikTok') {
      log('⚠️ Only TikTok supported. Skipping.');
      return;
    }
    
    const profileUrl = `https://www.tiktok.com/@${handle}`;
    
    // 2. Abrir TikTok com OpenClaw CLI
    log(`🌐 Opening ${profileUrl}...`);
    execSync(`openclaw browser open "${profileUrl}" --browser-profile openclaw`, { 
      stdio: 'inherit',
      timeout: 30000 
    });
    
    // 3. Esperar carregar
    log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Tirar snapshot
    log('📸 Capturing snapshot...');
    const snapshotOutput = execSync('openclaw browser snapshot --browser-profile openclaw --json', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });
    
    const snapshot = JSON.parse(snapshotOutput);
    const pageText = snapshot.snapshot || snapshot.text || snapshot.content || '';
    
    log(`✅ Snapshot captured (${pageText.length} chars)`);
    
    // 5. Parse dados
    log('🔬 Parsing data...');
    const data = parseProfile(pageText, handle);
    
    log(`📊 Extracted: ${data.followers} followers, ${data.totalLikes} likes, ${data.engagementRate}% engagement`);
    
    // 6. Atualizar via API
    log('📤 Updating database...');
    const updateRes = await fetch(`${VERCEL_API}/api/influencers/${influencer.id}`, {
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
        notes: `✅ Dados REAIS extraídos automaticamente via Browser em ${new Date().toLocaleString('pt-PT')}.\n\nBio: ${data.bio || 'N/A'}`
      })
    });
    
    if (updateRes.ok) {
      log('✅ SUCCESS! Influencer updated with real data');
      log(`💰 Price: €${data.estimatedPrice} | ⭐ Fit: ${data.fitScore}/5`);
    } else {
      const error = await updateRes.text();
      log(`❌ Update failed: ${error}`);
    }
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

function parseProfile(text, handle) {
  // Nome
  const nameMatch = text.match(new RegExp(`${handle}\\s+([^\\n]+)`));
  const name = nameMatch ? nameMatch[1].trim() : handle;
  
  // Followers
  const followersMatch = text.match(/(\d+\.?\d*[KM]?)\s+Seguidores/i) || text.match(/(\d+\.?\d*[KM]?)\s+Followers/i);
  const followers = parseNum(followersMatch ? followersMatch[1] : '0');
  
  // Likes
  const likesMatch = text.match(/(\d+\.?\d*[KM]?)\s+Gostos/i) || text.match(/(\d+\.?\d*[KM]?)\s+Likes/i);
  const totalLikes = parseNum(likesMatch ? likesMatch[1] : '0');
  
  // Bio
  const bioMatch = text.match(new RegExp(`${name}[\\s\\S]{0,200}?([\\s\\S]{10,200}?)(?:\\d+\\s+A seguir|\\d+\\s+Following)`));
  const bio = bioMatch ? bioMatch[1].trim() : '';
  
  // Email
  const emailMatch = bio.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  const email = emailMatch ? emailMatch[0] : null;
  
  // Video views
  const viewsRegex = /(\d+\.?\d*[KM]?)\s*▶/g;
  const views = [];
  let match;
  while ((match = viewsRegex.exec(text)) !== null && views.length < 10) {
    views.push(parseNum(match[1]));
  }
  
  const avgViews = views.length > 0 ? Math.round(views.reduce((a,b) => a+b, 0) / views.length) : 0;
  const averageViews = avgViews >= 1000000 ? `${(avgViews/1000000).toFixed(1)}M` :
                       avgViews >= 1000 ? `${(avgViews/1000).toFixed(1)}K` : avgViews.toString();
  
  // Engagement
  const engagementRate = followers > 0 ? parseFloat(((totalLikes/(followers*100))*100).toFixed(2)) : 0;
  const contentStability = engagementRate >= 5 ? 'HIGH' : engagementRate >= 3 ? 'MEDIUM' : 'LOW';
  
  // Tier
  const tier = followers < 10000 ? 'nano' : followers < 100000 ? 'micro' : followers < 1000000 ? 'macro' : 'mega';
  
  // Price
  const basePrice = tier === 'nano' ? 50 : tier === 'micro' ? 150 : tier === 'macro' ? 500 : 1500;
  const priceMultiplier = engagementRate >= 5 ? 1.5 : engagementRate >= 3 ? 1.2 : engagementRate >= 1 ? 1.0 : 0.7;
  const estimatedPrice = Math.round(basePrice * priceMultiplier);
  
  // Fit
  let fitScore = 3;
  const bioLower = bio.toLowerCase();
  if (/fashion|moda|lifestyle|beauty|beleza|luxury|luxo/.test(bioLower)) fitScore++;
  if (engagementRate >= 5) fitScore++;
  else if (engagementRate < 2) fitScore--;
  fitScore = Math.max(1, Math.min(5, fitScore));
  
  // Niche
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
    name, bio, followers, totalLikes, email,
    engagementRate, averageViews, contentStability,
    tier, estimatedPrice, fitScore, niche, contentTypes, tags
  };
}

function parseNum(str) {
  if (!str) return 0;
  const s = str.trim().toUpperCase();
  if (s.includes('M')) return Math.round(parseFloat(s) * 1000000);
  if (s.includes('K')) return Math.round(parseFloat(s) * 1000);
  return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
}

main();
