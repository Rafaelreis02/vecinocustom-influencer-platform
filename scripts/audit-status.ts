import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🕵️‍♂️ Iniciando auditoria de status...');
  try {
    const influencers = await prisma.influencer.findMany({
      select: { id: true, name: true, status: true }
    });
    
    if (influencers.length === 0) {
      console.log('⚠️ Nenhum influencer encontrado na Base de Dados.');
    } else {
      console.table(influencers);
    }
  } catch (error) {
    console.error('❌ Erro na auditoria:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
