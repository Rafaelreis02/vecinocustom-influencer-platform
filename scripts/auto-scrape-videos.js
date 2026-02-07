#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const VERCEL_API = process.env.VERCEL_BASE_URL || 'https://vecinocustom-influencer-platform.vercel.app';
const LOG_FILE = __dirname + '/auto-scrape.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line);
}

async function main() {
  log('🎬 Auto-Scrape Videos Started');
  
  try {
    // 1. Buscar campanhas ACTIVE com hashtag
    log('🔍 Fetching active campaigns...');
    const campaignsRes = await fetch(`${VERCEL_API}/api/campaigns?status=ACTIVE`);
    const campaigns = await campaignsRes.json();
    
    const activeCampaigns = campaigns.filter(c => c.hashtag && c.platform);
    
    if (activeCampaigns.length === 0) {
      log('✅ No active campaigns with hashtag. Done!');
      return;
    }
    
    log(`📋 Found ${activeCampaigns.length} campaigns to scan`);
    
    for (const campaign of activeCampaigns) {
      log(`\n🎯 Processing: ${campaign.name} (${campaign.platform})`);
      log(`   Hashtag: ${campaign.hashtag}`);
      
      try {
        // 2. Abrir hashtag no browser
        const hashtag = campaign.hashtag.replace('#', '');
        const platform = campaign.platform.toLowerCase();
        
        let searchUrl;
        if (platform === 'tiktok') {
          searchUrl = `https://www.tiktok.com/tag/${hashtag}`;
        } else if (platform === 'instagram') {
          searchUrl = `https://www.instagram.com/explore/tags/${hashtag}`;
        } else {
          log(`   ⚠️ Unsupported platform: ${platform}`);
          continue;
        }
        
        log(`   🌐 Opening ${searchUrl}...`);
        execSync(`openclaw browser open "${searchUrl}" --browser-profile openclaw`, {
          encoding: 'utf8',
          timeout: 30000
        });
        
        log('   ⏳ Waiting for page to load...');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Mais tempo para hashtag page
        
        log('   📸 Capturing snapshot...');
        const snapshotOutput = execSync('openclaw browser snapshot --browser-profile openclaw --json', {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        });
        
        const snapshot = JSON.parse(snapshotOutput);
        const pageText = snapshot.snapshot || snapshot.text || snapshot.content || '';
        
        log(`   ✅ Snapshot captured (${pageText.length} chars)`);
        
        // 3. Extrair vídeos (usar Claude Haiku para parse)
        log('   🤖 Analyzing with Claude Haiku...');
        const analysisRes = await fetch(`${VERCEL_API}/api/worker/analyze-hashtag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            hashtag: campaign.hashtag,
            platform: campaign.platform,
            snapshotText: pageText.slice(0, 50000) // Limit para Haiku
          })
        });
        
        if (analysisRes.ok) {
          const result = await analysisRes.json();
          log(`   ✅ Found ${result.newVideos || 0} new videos!`);
          if (result.skipped) {
            log(`   ⏭️ Skipped ${result.skipped} duplicates`);
          }
        } else {
          const error = await analysisRes.text();
          log(`   ❌ Analysis failed: ${error}`);
        }
        
      } catch (err) {
        log(`   ❌ ERROR processing campaign: ${err.message}`);
      }
    }
    
    log('\n🎉 Auto-scrape completed!');
    
  } catch (error) {
    log(`❌ FATAL ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
