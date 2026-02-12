import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpeza da base de dados...');
  try {
    // Apagar por ordem para respeitar chaves estrangeiras
    const snapshots = await prisma.campaignVideoSnapshot.deleteMany({});
    console.log(`✅ ${snapshots.count} snapshots eliminados.`);
    
    const videos = await prisma.video.deleteMany({});
    console.log(`✅ ${videos.count} vídeos eliminados.`);
    
    const influencersOnCampaigns = await prisma.campaignInfluencer.deleteMany({});
    console.log(`✅ ${influencersOnCampaigns.count} relações influencer/campanha eliminadas.`);
    
    const campaigns = await prisma.campaign.deleteMany({});
    console.log(`✅ ${campaigns.count} campanhas eliminadas.`);
    
    console.log('✨ Base de dados limpa com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
