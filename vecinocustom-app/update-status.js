const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const influencer = await prisma.influencer.update({
      where: { email: 'barbarapaisv@gmail.com' },
      data: { status: 'PENDING' } // Using PENDING as "suggestion" status
    });
    console.log('✅ Status atualizado:', influencer.name, '->', influencer.status);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
