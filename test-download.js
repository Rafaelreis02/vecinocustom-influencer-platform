const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const file = await prisma.file.findFirst({
    where: { type: 'DOCUMENT' },
  });

  if (!file) {
    console.log('No files found');
    return;
  }

  console.log('File found:');
  console.log(`  ID: ${file.id}`);
  console.log(`  Name: ${file.originalName}`);
  console.log(`  URL starts with: ${file.url.substring(0, 50)}...`);
  console.log(`  URL length: ${file.url.length} characters`);
  
  if (file.url.startsWith('data:')) {
    const [header, data] = file.url.split(',');
    console.log(`  Data URL type: ${header}`);
    console.log(`  Base64 data length: ${data.length} characters`);
    
    try {
      const buffer = Buffer.from(data, 'base64');
      console.log(`  ✓ Successfully decoded to ${buffer.length} bytes`);
    } catch (e) {
      console.log(`  ✗ Error decoding: ${e.message}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
