const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const auth = await prisma.shopifyAuth.findMany();
    console.log('ShopifyAuth records:');
    auth.forEach(a => {
      console.log(`\nShop: ${a.shop}`);
      console.log(`Token: ${a.accessToken.substring(0, 30)}...`);
      console.log(`Scopes: ${a.scope}`);
      console.log(`Updated: ${a.updatedAt}`);
    });
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
