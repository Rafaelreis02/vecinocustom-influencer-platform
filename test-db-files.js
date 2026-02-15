const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const files = await prisma.file.findMany({
    where: { type: 'DOCUMENT' },
    select: {
      id: true,
      originalName: true,
      size: true,
      mimeType: true,
      influencerId: true,
      uploadedAt: true,
    },
    take: 10,
  });

  console.log(`Found ${files.length} document files:\n`);
  files.forEach(file => {
    console.log(`ID: ${file.id}`);
    console.log(`  Name: ${file.originalName}`);
    console.log(`  Size: ${file.size} bytes`);
    console.log(`  MIME: ${file.mimeType}`);
    console.log(`  Influencer: ${file.influencerId}`);
    console.log(`  Uploaded: ${file.uploadedAt}`);
    console.log();
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
