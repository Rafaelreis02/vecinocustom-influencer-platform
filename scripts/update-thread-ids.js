#!/usr/bin/env node
/**
 * Script para atualizar gmailThreadId dos emails existentes
 * Corre diretamente na BD, sem precisar de API
 * 
 * Uso: node scripts/update-thread-ids.js
 */

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

const BATCH_SIZE = 50;
const DELAY_MS = 100;

async function getGmailAuth() {
  const { OAuth2 } = google.auth;
  
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

async function main() {
  console.log('🔧 Atualizando gmailThreadId dos emails...\n');

  try {
    // Verificar stats iniciais
    const [total, withoutThread] = await Promise.all([
      prisma.email.count(),
      prisma.email.count({ where: { gmailThreadId: null } }),
    ]);

    console.log(`📊 Total de emails: ${total}`);
    console.log(`📊 Sem threadId: ${withoutThread}`);
    console.log(`📊 Com threadId: ${total - withoutThread}\n`);

    if (withoutThread === 0) {
      console.log('✅ Todos os emails já têm threadId!');
      return;
    }

    // Confirmar
    console.log(`⚠️  Vou processar ${Math.min(withoutThread, BATCH_SIZE)} emails...`);
    console.log('⏳ A iniciar em 3 segundos...\n');
    await new Promise(r => setTimeout(r, 3000));

    // Buscar emails sem threadId
    const emails = await prisma.email.findMany({
      where: {
        gmailThreadId: null,
        gmailId: { not: null },
      },
      select: {
        id: true,
        gmailId: true,
        from: true,
        subject: true,
      },
      take: BATCH_SIZE,
    });

    console.log(`🔄 Processando ${emails.length} emails...\n`);

    // Autenticar Gmail
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    let updated = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        if (!email.gmailId) continue;

        process.stdout.write(`⏳ ${email.gmailId.substring(0, 20)}... `);

        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: email.gmailId,
          format: 'minimal',
        });

        const threadId = msg.data.threadId;

        if (threadId) {
          await prisma.email.update({
            where: { id: email.id },
            data: { gmailThreadId: threadId },
          });
          console.log('✅ Atualizado');
          updated++;
        } else {
          console.log('❌ Sem threadId');
          failed++;
        }

        await new Promise(r => setTimeout(r, DELAY_MS));

      } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Resultado:');
    console.log(`   ✅ Atualizados: ${updated}`);
    console.log(`   ❌ Falhados: ${failed}`);

    // Verificar stats finais
    const remaining = await prisma.email.count({ where: { gmailThreadId: null } });
    console.log(`\n📊 Ainda faltam: ${remaining} emails`);

    if (remaining > 0) {
      console.log('\n⚠️  Corre o script novamente para processar mais emails.\n');
    } else {
      console.log('\n🎉 Todos os emails foram atualizados!\n');
    }

  } catch (error) {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
