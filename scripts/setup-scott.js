const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Setup inicial do Scott (AI Agent)
 * 
 * CORRER:
 *   node scripts/setup-scott.js
 * 
 * ISTO CRIA:
 *   - User "AI_AGENT" na base de dados
 *   - API Key segura
 * 
 * OUTPUT:
 *   - API Key (copiar para 1Password!)
 *   - User ID
 */

const prisma = new PrismaClient();

async function setupScott() {
  console.log('🤖 Setup do Scott (AI Agent)\n');
  
  try {
    // Verificar se já existe
    const existing = await prisma.user.findFirst({
      where: { email: 'scott@vecinocustom.internal' }
    });
    
    if (existing) {
      console.log('⚠️  Scott já existe na base de dados!');
      console.log('   User ID:', existing.id);
      console.log('\nSe precisares de uma nova API Key, apaga o user primeiro:');
      console.log('   await prisma.user.delete({ where: { id: "' + existing.id + '" } })');
      process.exit(0);
    }
    
    // Gerar token seguro
    const randomBytes = crypto.randomBytes(32).toString('base64url');
    const token = `vecino_sk_${randomBytes}`;
    
    // Hash para guardar na DB
    const hashedToken = await bcrypt.hash(token, 10);
    
    // Criar user
    const scott = await prisma.user.create({
      data: {
        email: 'scott@vecinocustom.internal',
        name: 'Scott (AI Agent)',
        role: 'AI_AGENT',
        password: hashedToken, // Guardamos o hash do token
      }
    });
    
    console.log('✅ Scott criado com sucesso!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  GUARDAR NO 1PASSWORD (só mostrado uma vez):');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('   API Key:', token);
    console.log('   User ID:', scott.id);
    console.log('   Email:  ', scott.email);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📋 Próximos passos:');
    console.log('   1. Copiar a API Key para o 1Password (Vault: AI-VECINO)');
    console.log('   2. Adicionar ao .env do Scott: SCOTT_API_TOKEN=' + token);
    console.log('   3. Testar: node scripts/scott-api.js\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupScott();
