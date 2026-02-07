const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check if AI user exists
  let aiUser = await prisma.user.findUnique({
    where: { email: 'ai@vecinocustom.com' }
  });

  if (!aiUser) {
    aiUser = await prisma.user.create({
      data: {
        email: 'ai@vecinocustom.com',
        name: 'AI Agent 🤖',
        role: 'ADMIN'
      }
    });
    console.log('✅ AI User created:', aiUser);
  } else {
    console.log('✅ AI User already exists:', aiUser);
  }

  // Now add Carminh Lebre
  const influencer = await prisma.influencer.create({
    data: {
      name: 'Carminh Lebre',
      email: 'goncalosaravia@labbynaughtyboys.pt',
      tiktokHandle: 'carminholebre',
      tiktokFollowers: 47100,
      status: 'suggestion',
      tier: 'micro',
      tags: ['fashion', 'lifestyle', 'haul', 'unboxing', 'professional', 'portuguese'],
      notes: `ENCONTRADA VIA AI 🤖

📊 MÉTRICAS:
- 47.1K followers TikTok
- 2M likes totais
- Engagement: 42.5x (!!)
- Views médias: 3K-30K consistentes
- Virais ocasionais: 95K, 146K views

✨ ANÁLISE DE PERFIL:
- Estabilidade: EXCELENTE (HIGH)
- Já faz unboxings/hauls regularmente
- Tem agente profissional (PR: Gonçalo Saravia @ Lab by Naughty Boys)
- Engagement rate consistente e elevado
- Conteúdo: Lifestyle + Fashion mix

🎬 TIPO DE CONTEÚDO:
- 11 vídeos na playlist "Haul/Unboxings"
- 20 vídeos "Restaurantes"
- 24 vídeos "Challenges"
- Estilo profissional mas autêntico

💰 PRICING ESTIMADO: 80-120€
Base: 40-50K followers + representação profissional + engagement estável

🎯 FIT SCORE PARA JOIAS: 5/5
✅ Já faz unboxings (perfeito para mostrar produtos)
✅ Engagement estável (não depende de 1 viral)
✅ Conteúdo lifestyle permite contextualizar joias
✅ Representação profissional (facilita negociação)
✅ Audiência PT (mercado alvo)

🔗 LINKS:
TikTok: https://www.tiktok.com/@carminholebre
Instagram: @carminh...
Email agente: goncalosaravia@labbynaughtyboys.pt

📅 Descoberta: 2026-02-06
🔍 Método: TikTok search #fashionhaul
🤖 Adicionada automaticamente por AI Agent`,
      createdById: aiUser.id
    }
  });

  console.log('🎯 Influencer added:', influencer);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
