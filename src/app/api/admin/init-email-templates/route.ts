import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * TEMPLATES DEFINITIVOS DO SISTEMA DE EMAILS
 *
 * REGRA: email só é enviado quando NÓS avançamos um step.
 * Ações do influencer no portal NÃO disparam email de confirmação.
 *
 * Mapeamento de chaves → usage:
 *   INITIAL_CONTACT             → Prospecção manual (antes de criar parceria)
 *   STEP_1_PARTNERSHIP_WITH_VALUE → partnerships/create (agreedPrice > 0)
 *   STEP_1_PARTNERSHIP_NO_VALUE   → partnerships/create (agreedPrice == 0)
 *   STEP_3_PREPARING            → advance Step 3 (nós confirmamos produto)
 *   DESIGN_REVIEW_FIRST         → partnerships/[id]/design-messages (1ª prova)
 *   DESIGN_REVIEW_REVISION      → partnerships/[id]/design-messages (revisão)
 *   STEP_5_CONTRACT_WITH_VALUE  → advance Step 5 (contrato, parceria com valor)
 *   STEP_5_CONTRACT_NO_VALUE    → advance Step 5 (contrato, só comissão)
 *   STEP_7_SHIPPED              → advance Step 7 (encomenda enviada com tracking)
 */
const DEFAULT_TEMPLATES = [
  // ─── 0. PROSPECÇÃO ───────────────────────────────────────────────────────────
  {
    key: 'INITIAL_CONTACT',
    name: 'Contacto Inicial - Prospecção',
    subject: 'Colaboração VecinoCustom - Interessado?',
    body: `Olá {{nome}},

Somos a VecinoCustom, uma marca de joias personalizadas feitas à mão em Portugal.

Gostamos muito do teu conteúdo e queríamos saber se terias interesse numa colaboração connosco.

Se sim, responde a este email ou pelo WhatsApp e falamos em mais detalhes!

Cumprimentos,
Equipa VecinoCustom

---
www.vecinocustom.com`,
    step: 0,
    hasValue: true,
  },

  // ─── 1. PROPOSTA DE PARCERIA ─────────────────────────────────────────────────
  {
    key: 'STEP_1_PARTNERSHIP_WITH_VALUE',
    name: 'Step 1: Proposta de Parceria - Com Valor',
    subject: 'Parceria VecinoCustom - Proposta para ti 🎉',
    body: `Olá {{nome}},

Temos uma proposta de parceria para ti!

Oferecemos-te:
• Uma peça personalizada VecinoCustom (à tua escolha)
• {{valor}}€ pela tua colaboração
• Cupom exclusivo com desconto para a tua comunidade
• 20% de comissão em cada venda com o teu cupom

Para veres todos os detalhes e aceitares, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 1,
    hasValue: true,
  },
  {
    key: 'STEP_1_PARTNERSHIP_NO_VALUE',
    name: 'Step 1: Proposta de Parceria - Sem Valor',
    subject: 'Parceria VecinoCustom - Oportunidade para ti 🎉',
    body: `Olá {{nome}},

Temos uma proposta de parceria para ti!

Oferecemos-te:
• Uma peça personalizada VecinoCustom (à tua escolha)
• Cupom exclusivo com desconto para a tua comunidade
• 20% de comissão em cada venda com o teu cupom

Para veres todos os detalhes e aceitares, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 1,
    hasValue: false,
  },

  // ─── 3. PREPARAÇÃO ───────────────────────────────────────────────────────────
  {
    key: 'STEP_3_PREPARING',
    name: 'Step 3: Peça em Preparação',
    subject: 'VecinoCustom - A tua peça está em preparação ✨',
    body: `Olá {{nome}},

Ótimas notícias! Confirmámos a tua peça e já estamos a prepará-la com todo o cuidado.

🛍️ Produto escolhido: {{url_produto}}

Para enviares a foto ou referência do que desejas gravar na peça, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Assim que recebermos a tua referência, vamos criar o design e enviar-te para aprovação. Poderás aceitar ou pedir alterações.

Fica atento ao teu email!

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 3,
    hasValue: true,
  },

  // ─── 4. DESIGN REVIEW ────────────────────────────────────────────────────────
  {
    key: 'DESIGN_REVIEW_FIRST',
    name: 'Design Review: Primeira Prova',
    subject: '🎨 O teu design está pronto!',
    body: `Olá {{nome}},

Temos uma excelente notícia! 🎉

O design da tua peça personalizada está pronto e enviamos a pré-visualização para ti.

Podes ver o mockup e aprovar (ou pedir alterações) através do teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Se precisares de alguma alteração, podes descrever o que queres mudar ou enviar uma imagem de referência.

Assim que aprovares o design, avançamos para a produção final!

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 4,
    hasValue: true,
  },
  {
    key: 'DESIGN_REVIEW_REVISION',
    name: 'Design Review: Revisão',
    subject: '🎨 Revisão do teu design - Verifica as alterações',
    body: `Olá {{nome}},

Fizemos as alterações ao teu design! 🎨

Podes ver a nova versão e aprovar (ou pedir mais alterações) através do teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

{{mensagem}}

Assim que aprovares, avançamos com a produção da tua peça.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 4,
    hasValue: true,
  },

  // ─── 5. CONTRATO ─────────────────────────────────────────────────────────────
  {
    key: 'STEP_5_CONTRACT_WITH_VALUE',
    name: 'Step 5: Contrato - Com Valor',
    subject: 'VecinoCustom - O teu contrato está pronto para assinar 📝',
    body: `Olá {{nome}},

Boa notícia! A tua peça personalizada está em preparação e o teu contrato de colaboração já está disponível.

Resumo da parceria:
• Peça personalizada VecinoCustom (à tua escolha)
• {{valor}}€ de compensação
• Cupom exclusivo com 10% desconto para a tua comunidade
• 20% de comissão em cada venda com o teu cupom

Para assinares o contrato, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

A assinatura é digital e rápida — menos de 1 minuto.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 5,
    hasValue: true,
  },
  {
    key: 'STEP_5_CONTRACT_NO_VALUE',
    name: 'Step 5: Contrato - Apenas Comissão',
    subject: 'VecinoCustom - O teu contrato está pronto para assinar 📝',
    body: `Olá {{nome}},

Boa notícia! A tua peça personalizada está em preparação e o teu contrato de colaboração já está disponível.

Resumo da parceria:
• Peça personalizada VecinoCustom (à tua escolha)
• Cupom exclusivo com 10% desconto para a tua comunidade
• 20% de comissão em cada venda com o teu cupom

Para assinares o contrato, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

A assinatura é digital e rápida — menos de 1 minuto.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 5,
    hasValue: false,
  },

  // ─── 7. ENVIADO ──────────────────────────────────────────────────────────────
  {
    key: 'STEP_7_SHIPPED',
    name: 'Step 7: Encomenda Enviada',
    subject: 'VecinoCustom - A tua peça foi enviada! 📦',
    body: `Olá {{nome}},

A tua peça personalizada foi enviada! 📦

Podes acompanhar a entrega aqui: {{tracking_url}}

Assim que receberes:
1. Cria um vídeo criativo com a peça
2. Tira uma fotografia de qualidade
3. Publica nas tuas redes e envia-nos o link para aprovação

O teu cupom exclusivo **{{cupom}}** já está ativo — partilha com a tua comunidade!

Tens 5 dias úteis após a receção para completares esta etapa.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`,
    step: 7,
    hasValue: true,
  },
];

// POST /api/admin/init-email-templates
export async function POST(req: NextRequest) {
  try {
    // Aceitar autenticação via NextAuth session OU via CRON_SECRET header
    const cronSecret = req.headers.get('x-cron-secret');
    const isAuthorizedViaCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isAuthorizedViaCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const results = [];

    for (const template of DEFAULT_TEMPLATES) {
      try {
        const existing = await prisma.emailTemplate.findUnique({
          where: { key: template.key },
        });

        if (existing) {
          await prisma.emailTemplate.update({
            where: { key: template.key },
            data: {
              name: template.name,
              subject: template.subject,
              body: template.body,
              step: template.step,
              hasValue: template.hasValue,
              isActive: true,
            },
          });
          results.push({ key: template.key, action: 'updated' });
        } else {
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
