const pendingUrl = 'https://vecinocustom-influencer-platform.vercel.app/api/worker/pending';
const updateBaseUrl = 'https://vecinocustom-influencer-platform.vercel.app/api/influencers';

async function processPending() {
  console.log('Checking pending...');
  try {
    while (true) {
      const res = await fetch(pendingUrl);
      const data = await res.json();
      
      if (!data.found || !data.task) {
        console.log('No more pending tasks.');
        break;
      }

      const task = data.task;
      console.log(`Processing ${task.name} (${task.id})...`);

      // Force update to negotiating without scraping (since scraping failed)
      const updateRes = await fetch(`${updateBaseUrl}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'negotiating',
          notes: '⚠️ Importação forçada. Verificar dados manualmente.',
          // Default empty metrics to avoid UI errors
          tiktokFollowers: 0,
          instagramFollowers: 0,
          engagementRate: 0,
          averageViews: 'N/A',
          contentStability: 'MEDIUM',
          country: 'Portugal',
          language: 'PT',
          niche: 'Lifestyle',
          contentTypes: ['Lifestyle'],
          primaryPlatform: 'TikTok',
          fitScore: 3,
          estimatedPrice: 0
        })
      });

      if (updateRes.ok) {
        console.log(`✅ ${task.name} moved to negotiating.`);
      } else {
        console.error(`❌ Failed to update ${task.name}:`, await updateRes.text());
        break; // Stop on error to avoid infinite loop
      }
      
      // Small delay
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

processPending();
