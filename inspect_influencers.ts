
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const influencers = await prisma.influencer.findMany({
    take: 5,
    include: {
        videos: true
    }
  });
  console.log(JSON.stringify(influencers, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
  
  const count = await prisma.influencer.count();
  console.log("Total influencers:", count);

  const byCountry = await prisma.influencer.groupBy({
    by: ['country'],
    _count: {
      id: true
    }
  });
  console.log("By Country:", byCountry);

  const byStatus = await prisma.influencer.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });
  console.log("By Status:", byStatus);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
