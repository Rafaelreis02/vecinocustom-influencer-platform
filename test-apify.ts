/**
 * Test Apify Integration
 * 
 * Run with: npx tsx test-apify.ts
 */

import { parseProfile, scrapeHashtagVideos } from './src/lib/apify';

async function main() {
  console.log('🧪 Testing Apify Integration\n');
  console.log('=' .repeat(60));

  // Test 1: Parse TikTok Profile
  console.log('\n📱 Test 1: Parse TikTok Profile (@vecinocustom)');
  console.log('-'.repeat(60));
  try {
    const profile = await parseProfile('vecinocustom', 'TIKTOK');
    console.log('✅ SUCCESS!');
    console.log(JSON.stringify(profile, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
  }

  // Test 2: Scrape Hashtag Videos
  console.log('\n\n#️⃣ Test 2: Scrape Hashtag Videos (#vecinocustom)');
  console.log('-'.repeat(60));
  try {
    const videos = await scrapeHashtagVideos('vecinocustom', 5); // Only 5 for testing
    console.log(`✅ SUCCESS! Found ${videos.length} videos\n`);
    
    videos.forEach((video, index) => {
      console.log(`Video ${index + 1}:`);
      console.log(`  Author: @${video.authorUsername}`);
      console.log(`  URL: ${video.videoUrl}`);
      console.log(`  Views: ${video.viewCount?.toLocaleString() || 'N/A'}`);
      console.log(`  Likes: ${video.likeCount?.toLocaleString() || 'N/A'}`);
      console.log(`  Comments: ${video.commentCount?.toLocaleString() || 'N/A'}`);
      console.log(`  Published: ${video.publishedAt?.toISOString() || 'N/A'}`);
      console.log('');
    });
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Tests completed!');
}

main().catch(console.error);
