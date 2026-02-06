const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Criar ou encontrar usuário admin
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('📝 Criando usuário admin...');
      admin = await prisma.user.create({
        data: {
          email: 'admin@vecinocustom.com',
          name: 'Admin',
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin criado:', admin.email);
    } else {
      console.log('✅ Admin encontrado:', admin.email);
    }

    // 2. Criar influencer
    const influencer = await prisma.influencer.create({
      data: {
        name: 'Bárbara Vasconcelos',
        email: 'barbarapaisv@gmail.com',
        address: 'Portugal',
        instagramHandle: '@barbarapaisdv',
        tiktokHandle: '@barbarapaisdv',
        tiktokFollowers: 4511,
        status: 'ACTIVE',
        tier: 'micro',
        notes: 'Vídeo com VecinoCustom teve 575.9K views! Ótimo engagement. Idade: 22 anos. Muito ativa em conteúdo de beauty e lifestyle.',
        tags: ['Lifestyle', 'Beauty', 'Fashion', 'Makeup'],
        createdById: admin.id
      }
    });
    
    console.log('\n🎉 Influencer adicionado com sucesso!');
    console.log('   Nome:', influencer.name);
    console.log('   ID:', influencer.id);
    console.log('   Status:', influencer.status);
    console.log('   TikTok:', influencer.tiktokHandle, `(${influencer.tiktokFollowers} followers)`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
