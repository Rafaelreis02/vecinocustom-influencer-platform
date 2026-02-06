const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.influencer.updateMany({
      where: { email: 'barbarapaisv@gmail.com' },
      data: { status: 'suggestion' }
    });
    console.log('✅ Status atualizado:', result.count, 'influencer(s)');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
