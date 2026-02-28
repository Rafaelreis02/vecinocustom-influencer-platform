import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Default modern email templates
const DEFAULT_TEMPLATES = [
  {
    key: 'INITIAL_CONTACT',
    name: 'Contacto Inicial - Prospecção',
    subject: 'Colaboração VecinoCustom - Interessado?',
    body: `Olá {{nome}},

Somos a VecinoCustom, uma marca de joias personalizadas feitas à mão em Portugal.

Gostamos muito do teu conteúdo no Instagram e queríamos saber se terias interesse numa colaboração connosco.

Se sim, responde a este email ou pelo WhatsApp que falamos em mais detalhes.

Cumprimentos,
Equipa VecinoCustom

---
www.vecinocustom.com`,
    step: 0,
    hasValue: true,
  },
  {
    key: 'STEP_1_WITH_VALUE',
    name: 'Step 1: Partnership - Com Valor',
    subject: 'Parceria VecinoCustom - Proposta para ti',
    body: `Olá {{nome}},

Temos uma proposta de parceria para ti.

Oferecemos-te uma peça personalizada da VecinoCustom mais {{valor}}€ pela tua colaboração.

Vantagens para ti:
- Peça personalizada gratuita
- Cupom exclusivo com 10% desconto para a tua comunidade
- 20% de comissão em cada venda realizada com o teu cupom

Para aceitar e ver todos os detalhes, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email ou contacta-nos via WhatsApp.`,
    step: 1,
    hasValue: true,
  },
  {
    key: 'STEP_1_NO_VALUE',
    name: 'Step 1: Partnership - Sem Valor',
    subject: 'Parceria VecinoCustom - Oportunidade para ti',
    body: `Olá {{nome}},

Temos uma proposta de parceria para ti.

Oferecemos-te uma peça personalizada da VecinoCustom e criamos um cupom exclusivo para a tua comunidade.

Vantagens para ti:
- Peça personalizada gratuita
- Cupom exclusivo com 10% desconto para os teus seguidores
- 20% de comissão em cada venda realizada com o teu cupom

Para aceitar e completar os teus dados, acede ao teu portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email ou contacta-nos via WhatsApp.`,
    step: 1,
    hasValue: false,
  },
  {
    key: 'STEP_2',
    name: 'Step 2: Shipping',
    subject: 'VecinoCustom - Dados de envio necessários',
    body: `Olá {{nome}},

A tua proposta foi aceite. Agora precisamos dos teus dados de envio para enviarmos a tua peça personalizada.

Por favor, acede ao teu portal e preenche:
- Morada completa de entrega
- 3 sugestões de peças que gostarias de receber

Link para o portal:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Assim que recebermos os dados, preparamos a tua encomenda.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, estamos disponíveis via email ou WhatsApp.`,
    step: 2,
    hasValue: true,
  },
  {
    key: 'STEP_3',
    name: 'Step 3: Preparing',
    subject: 'VecinoCustom - Encomenda em preparação',
    body: `Olá {{nome}},

As tuas sugestões foram aceites e a tua peça personalizada está em preparação.

Em breve enviamos a encomenda e enviamos o código de tracking para acompanhares a entrega.

Fica atento ao teu email.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, contacta-nos via email ou WhatsApp.`,
    step: 3,
    hasValue: true,
  },
  {
    key: 'STEP_4',
    name: 'Step 4: Contract',
    subject: 'VecinoCustom - Contrato para assinatura',
    body: `Olá {{nome}},

A tua peça já foi enviada.

Antes da entrega, precisamos que assines o contrato digital. O processo é simples e seguro.

Para acederes ao contrato, usa o seguinte link:
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Após receberes a peça, tens 5 dias úteis para criares e partilhares o conteúdo.

Cumprimentos,
Equipa VecinoCustom

---
Para esclarecimentos, responde a este email.`,
    step: 4,
    hasValue: true,
  },
  {
    key: 'STEP_5',
    name: 'Step 5: Shipped',
    subject: 'VecinoCustom - Encomenda enviada',
    body: `Olá {{nome}},

A tua peça personalizada foi enviada.

Podes acompanhar a entrega aqui: {{tracking_url}}

Após receberes:
1. Grava um vídeo criativo com a peça
2. Tira uma fotografia de qualidade
3. Publica nas tuas redes e envia-nos para aprovação

Tens 5 dias úteis após a receção para completares esta etapa.

O teu cupom {{cupom}} está ativo e pronto a usar.

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, estamos disponíveis.`,
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
