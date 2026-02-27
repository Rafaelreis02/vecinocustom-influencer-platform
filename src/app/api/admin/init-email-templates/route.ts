import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Default modern email templates
const DEFAULT_TEMPLATES = [
  {
    key: 'STEP_1_WITH_VALUE',
    name: 'Step 1: Partnership - Com Valor',
    subject: '✨ A tua proposta está pronta, {{nome}}!',
    body: `Oii {{nome}}! 👋

Temos uma proposta super fixe para ti! 💎

Queremos oferecer-te uma peça personalizada da VecinoCustom + {{valor}}€ pela tua criatividade! 😍

E ainda tens um cupom exclusivo para a tua comunidade: 10% desconto e tu ganhas 20% comissão em cada venda! 🎉

Tudo o que precisamos é de um vídeo e uma foto a mostrar a tua peça nas redes! 📱✨

Queres aceitar? Clica aqui 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Responde a este email ou fala connosco no WhatsApp! 📲`,
    step: 1,
    hasValue: true,
  },
  {
    key: 'STEP_1_NO_VALUE',
    name: 'Step 1: Partnership - Sem Valor',
    subject: '✨ Tens uma parceria à tua espera, {{nome}}!',
    body: `Oii {{nome}}! 👋

Temos uma oportunidade incrível para ti! 💎

Queremos oferecer-te uma peça personalizada da VecinoCustom e ainda criar um cupom exclusivo para ti! 🎁

A tua comunidade tem 10% desconto e TU ganhas 20% comissão em CADA venda! 💰✨

Só precisamos de um vídeo e uma foto com a tua peça! 📱

Topas? Clica aqui para aceitar 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Responde a este email ou manda WhatsApp! 📲`,
    step: 1,
    hasValue: false,
  },
  {
    key: 'STEP_2',
    name: 'Step 2: Shipping',
    subject: '📦 Precisamos da tua morada, {{nome}}!',
    body: `Yaaay {{nome}}! 🎉

A tua proposta foi aceite! Agora precisamos da tua morada para enviarmos a tua peça personalizada! 📦💎

Clica no link abaixo e preenche:
• A tua morada completa 🏠
• 3 sugestões de peças que gostavas de receber ✨

É super rápido! 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Mal recebamos, preparamos tudo com muito carinho! 💙

Beijinhos,
Equipa VecinoCustom

---
Qualquer dúvida estamos aqui! 📲`,
    step: 2,
    hasValue: true,
  },
  {
    key: 'STEP_3',
    name: 'Step 3: Preparing',
    subject: '🔥 Estamos a preparar a tua peça, {{nome}}!',
    body: `Oii {{nome}}! 💎

As tuas sugestões foram aceites e já estamos a preparar a tua peça personalizada! 🔥

Vais adorar o resultado! ✨

Em breve enviamos e dámos-te o código de tracking para acompanhares! 📦

Fica atenta ao teu email! 😉

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Contacta-nos! 📲`,
    step: 3,
    hasValue: true,
  },
  {
    key: 'STEP_4',
    name: 'Step 4: Contract',
    subject: '📝 Assina o contrato e é tudo teu, {{nome}}!',
    body: `Hey {{nome}}! 👋

A tua peça já está a caminho! 🎁📦

Antes de chegar, precisamos que assines o contrato digital. É super rápido e seguro! ✅

Clica aqui 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Assim que receberes a peça, tens 5 dias para criares o conteúdo e partilhares! 📱✨

Qualquer dúvida estamos aqui para ajudar! 💙

Beijinhos,
Equipa VecinoCustom

---
Perguntas? Responde a este email! 📧`,
    step: 4,
    hasValue: true,
  },
  {
    key: 'STEP_5',
    name: 'Step 5: Shipped',
    subject: '🚀 Já foi! A tua peça está a caminho, {{nome}}!',
    body: `Oii {{nome}}! 🎉

A tua peça personalizada já foi enviada! 📦💎

Podes acompanhar aqui: {{tracking_url}}

Assim que receberes:
1. Grava um vídeo criativo com a peça 📱
2. Tira uma foto linda 📸
3. Publica e envia-nos para aprovação ✅

Tens 5 dias após receber! ✨

O teu cupom {{cupom}} já está ativo para a tua comunidade! 🎁

Dúvidas? Estamos aqui! 💙

Beijinhos,
Equipa VecinoCustom

---
Boa sorte! Vais arrasar! 🌟`,
    step: 5,
    hasValue: true,
  },
];

// POST /api/admin/init-email-templates
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const template of DEFAULT_TEMPLATES) {
      try {
        // Check if template already exists
        const existing = await prisma.emailTemplate.findUnique({
          where: { key: template.key },
        });

        if (existing) {
          // Update existing template
          await prisma.emailTemplate.update({
            where: { key: template.key },
            data: {
              subject: template.subject,
              body: template.body,
              isActive: true,
            },
          });
          results.push({ key: template.key, action: 'updated' });
        } else {
          // Create new template
          await prisma.emailTemplate.create({
            data: {
              key: template.key,
              name: template.name,
              subject: template.subject,
              body: template.body,
              step: template.step,
              hasValue: template.hasValue,
              isActive: true,
            },
          });
          results.push({ key: template.key, action: 'created' });
        }
      } catch (error: any) {
        logger.error(`Failed to process template ${template.key}:`, error);
        results.push({ key: template.key, action: 'error', error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Templates initialized successfully',
      results,
    });
  } catch (error: any) {
    logger.error('Failed to init email templates:', error);
    return NextResponse.json(
      { error: 'Failed to initialize templates: ' + error.message },
      { status: 500 }
    );
  }
}
