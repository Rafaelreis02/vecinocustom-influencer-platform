const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Procurar Carminh Lebre
  const carminh = await prisma.influencer.findFirst({
    where: { name: 'Carminh Lebre' }
  });

  if (!carminh) {
    console.log('❌ Carminh Lebre não encontrada!');
    return;
  }

  console.log('✅ Encontrei a Carminh! ID:', carminh.id);

  // Atualizar com métricas organizadas
  const updated = await prisma.influencer.update({
    where: { id: carminh.id },
    data: {
      // Social Media
      tiktokHandle: 'carminholebre',
      tiktokFollowers: 47100,
      
      // Metrics & Performance
      totalLikes: 2000000n, // BigInt para números grandes
      engagementRate: 42.5,
      averageViews: '3K-30K',
      contentStability: 'HIGH',
      
      // Demographics & Content
      country: 'Portugal',
      language: 'PT',
      niche: 'Fashion/Lifestyle',
      contentTypes: ['Hauls', 'Unboxings', 'Restaurants', 'Challenges'],
      primaryPlatform: 'TikTok',
      
      // Business
      estimatedPrice: 100.0,
      fitScore: 5,
      
      // Discovery
      discoveryMethod: 'TikTok search #fashionhaul',
      discoveryDate: new Date('2026-02-06'),
      
      // Status
      status: 'suggestion',
      tier: 'micro',
      
      // Tags
      tags: ['fashion', 'lifestyle', 'haul', 'unboxing', 'professional', 'portuguese'],
      
      // Notas simplificadas (só o essencial)
      notes: `🤖 Encontrada via AI - #fashionhaul

🎯 FIT SCORE: 5/5 - Perfeita para joias!

✅ PONTOS FORTES:
- Já faz unboxings regularmente (11 vídeos)
- Engagement estável e elevado (42.5x)
- Representação profissional (PR: Gonçalo Saravia @ Lab by Naughty Boys)
- Conteúdo lifestyle permite contextualizar joias
- Virais ocasionais (95K, 146K views)

📧 CONTACTO: goncalosaravia@labbynaughtyboys.pt (agente)

🔗 LINKS:
TikTok: https://www.tiktok.com/@carminholebre
Instagram: @carminh...`
    }
  });

  console.log('🎉 Carminh Lebre atualizada com sucesso!');
  console.log('📊 Métricas agora nos campos corretos!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
