import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@vecinocustom.com' },
    update: {},
    create: {
      email: 'admin@vecinocustom.com',
      name: 'Admin VecinoCustom',
      password: hashedPassword,
      role: 'ADMIN',
      emailSignature: 'Com os melhores cumprimentos,\nEquipa VecinoCustom',
    },
  });

  console.log('✅ Seed completed:', user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
