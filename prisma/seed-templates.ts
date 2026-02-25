import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding email templates...');

  const templates = [
    // Step 1: Partnership - First contact (with value)
    {
      key: 'STEP_1_PARTNERSHIP_WITH_VALUE',
      name: 'Step 1: Primeiro Contacto (Com Valor)',
      subject: 'Parceria VecinoCustom - Proposta de {{valor}}€',
      body: `Olá {{nome}}!

Espero que estejas bem! Vim da parte da VecinoCustom, uma marca de joias personalizadas portuguesa.

Adoramos o teu conteúdo e achamos que faz sentido uma parceria entre nós! 💎

Temos uma proposta de {{valor}}€ para ti, mas gostávamos de saber se tens interesse em colaborar connosco.

Podes responder-nos com:
- O teu email (se for diferente)
- O teu Instagram
- O teu Whatsapp (para comunicação mais rápida)

Ficamos à espera do teu retorno!

Beijinhos,
Equipa VecinoCustom`,
      step: 1,
      hasValue: true,
    },
    // Step 1: Partnership - First contact (without value - commission only)
    {
      key: 'STEP_1_PARTNERSHIP_NO_VALUE',
      name: 'Step 1: Primeiro Contacto (Apenas Comissão)',
      subject: 'Parceria VecinoCustom - Comissão por venda',
      body: `Olá {{nome}}!

Espero que estejas bem! Vim da parte da VecinoCustom, uma marca de joias personalizadas portuguesa.

Adoramos o teu conteúdo e achamos que faz sentido uma parceria entre nós! 💎

Nesta parceria, não temos valor fixo, mas oferecemos uma comissão generosa por cada venda que vier do teu código!

Podes responder-nos com:
- O teu email (se for diferente)
- O teu Instagram
- O teu Whatsapp (para comunicação mais rápida)

Ficamos à espera do teu retorno!

Beijinhos,
Equipa VecinoCustom`,
      step: 1,
      hasValue: false,
    },
    // Step 2: Shipping (with value)
    {
      key: 'STEP_2_SHIPPING_WITH_VALUE',
      name: 'Step 2: Acordo Feito (Com Valor)',
      subject: 'Acordo confirmado! Preparar envio 🎁',
      body: `Olá {{nome}}!

Ficamos muito felizes em confirmar a nossa parceria! 🎉

Acordo:
- Valor: {{valor}}€
- Produto: Personalizado à tua escolha

Para prepararmos o teu envio, precisamos que nos envies:
1. A tua morada completa
2. 3 sugestões de produtos que gostarias de receber

Assim que recebermos, vamos preparar tudo com muito carinho!

Beijinhos,
Equipa VecinoCustom`,
      step: 2,
      hasValue: true,
    },
    // Step 2: Shipping (without value)
    {
      key: 'STEP_2_SHIPPING_NO_VALUE',
      name: 'Step 2: Acordo Feito (Apenas Comissão)',
      subject: 'Acordo confirmado! Preparar envio 🎁',
      body: `Olá {{nome}}!

Ficamos muito felizes em confirmar a nossa parceria! 🎉

Acordo:
- Comissão por venda
- Produto: Personalizado à tua escolha

Para prepararmos o teu envio, precisamos que nos envies:
1. A tua morada completa
2. 3 sugestões de produtos que gostarias de receber

Assim que recebermos, vamos preparar tudo com muito carinho!

Beijinhos,
Equipa VecinoCustom`,
      step: 2,
      hasValue: false,
    },
    // Step 3: Preparing
    {
      key: 'STEP_3_PREPARING',
      name: 'Step 3: Produto Selecionado',
      subject: 'O teu produto está a ser preparado! ✨',
      body: `Olá {{nome}}!

Já escolhemos o produto especialmente para ti! ✨

Vê aqui a prova do design: {{url_produto}}

Se quiseres ajustar alguma coisa (cor, nome, data), é só dizeres!

Assim que confirmares, preparamos o teu pedido para envio.

Beijinhos,
Equipa VecinoCustom`,
      step: 3,
      hasValue: true,
    },
    // Step 4: Contract
    {
      key: 'STEP_4_CONTRACT',
      name: 'Step 4: Contrato para Assinar',
      subject: 'Contrato da parceria - VecinoCustom 📄',
      body: `Olá {{nome}}!

Tudo pronto! Enviamos-te o contrato da parceria para assinares.

Podes ver e assinar aqui: {{url_contrato}}

Assim que assinares, enviamos o teu produto no mesmo dia! 🚚

Qualquer dúvida, estamos aqui!

Beijinhos,
Equipa VecinoCustom`,
      step: 4,
      hasValue: true,
    },
    // Step 5: Shipped
    {
      key: 'STEP_5_SHIPPED',
      name: 'Step 5: Produto Enviado',
      subject: 'O teu produto foi enviado! 🚚✨',
      body: `Olá {{nome}}!

Excelentes notícias! O teu produto foi enviado! 🎉

Tracking: {{tracking_url}}
Cupom de desconto para os teus seguidores: {{cupom}}

Estamos ansiosos para ver o teu conteúdo! Não te esqueças de marcar @vecinocustom 💎

Beijinhos,
Equipa VecinoCustom`,
      step: 5,
      hasValue: true,
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: template.key },
      update: {},
      create: template,
    });
  }

  console.log(`✅ Created ${templates.length} email templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
