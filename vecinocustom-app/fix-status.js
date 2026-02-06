const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Update directly via raw SQL to bypass enum validation
    await prisma.$executeRaw`UPDATE influencers SET status = 'suggestion' WHERE email = 'barbarapaisv@gmail.com'`;
    console.log('✅ Status atualizado para suggestion');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
