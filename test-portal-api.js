#!/usr/bin/env node

const https = require('https');

// Get token from environment or hardcoded test
const PORTAL_TOKEN = process.env.PORTAL_TOKEN || 'test-token-here';
const SEARCH_QUERY = process.argv[2] || 'necklace';

console.log(`Testing portal API search...`);
console.log(`Domain: vecinocustom-influencer-platform.vercel.app`);
console.log(`Query: ${SEARCH_QUERY}`);
console.log(`Token: ${PORTAL_TOKEN.substring(0, 10)}...`);
console.log('');

const url = `https://vecinocustom-influencer-platform.vercel.app/api/portal/${PORTAL_TOKEN}/products?q=${encodeURIComponent(SEARCH_QUERY)}`;

console.log(`URL: ${url}`);
console.log('');

https.get(url, (res) => {
  let data = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      console.log('Response body:');
      if (res.statusCode === 200 && data.startsWith('[')) {
        const parsed = JSON.parse(data);
        console.log(`Found ${parsed.length} products:`);
        parsed.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.title}`);
          console.log(`     URL: ${p.url}`);
          console.log(`     Image: ${p.image ? 'Yes' : 'No'}`);
        });
      } else {
        console.log(data);
      }
    } catch (e) {
      console.log(data);
    }
  });
}).on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
