/**
 * Script para adicionar dados de teste para comissões
 * Cria comissões com status: PENDING, PROCESSING, PAID
 * 
 * Executar: npx ts-node scripts/seed-commissions-test.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedCommissionsTest() {
  console.log('🌱 A adicionar dados de teste para comissões...\n');

  try {
    // Buscar influencers criados anteriormente
    const influencers = await prisma.influencer.findMany({
      take: 3,
      select: { id: true, name: true, email: true, paymentMethod: true }
    });

    if (influencers.length < 3) {
      console.log('❌ Precisas de pelo menos 3 influencers. Executa primeiro: npx ts-node scripts/seed-complete.ts');
      return;
    }

    console.log('✅ Influencers encontrados:', influencers.map(i => i.name));

    // Buscar cupões
    const coupons = await prisma.coupon.findMany({
      take: 3,
      select: { id: true, code: true, influencerId: true, commissionRate: true }
    });

    console.log('✅ Cupões encontrados:', coupons.map(c => c.code));

    // Criar comissões PENDING (para aba Pendentes)
    console.log('\n1️⃣ A criar comissões PENDING...');
    
    const pendingCommissions = await Promise.all([
      // Joana - 3 comissões pendentes
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 12.50,
          currency: 'EUR',
          description: 'Comissão Encomenda #1001 | Cupão: VECINO_JOANA_10 | Cliente: ana.silva@email.com | Valor: €125.00',
          status: 'PENDING',
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '1001',
            orderName: '#1001',
            orderDate: '2026-02-10T10:30:00Z',
            customerEmail: 'ana.silva@email.com',
            totalAmount: 125.00,
            baseAmount: 125.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 8.90,
          currency: 'EUR',
          description: 'Comissão Encomenda #1005 | Cupão: VECINO_JOANA_10 | Cliente: maria.ferreira@email.com | Valor: €89.00',
          status: 'PENDING',
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '1005',
            orderName: '#1005',
            orderDate: '2026-02-11T14:20:00Z',
            customerEmail: 'maria.ferreira@email.com',
            totalAmount: 89.00,
            baseAmount: 89.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 15.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #1008 | Cupão: VECINO_JOANA_10 | Cliente: carla.santos@email.com | Valor: €150.00',
          status: 'PENDING',
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '1008',
            orderName: '#1008',
            orderDate: '2026-02-12T09:15:00Z',
            customerEmail: 'carla.santos@email.com',
            totalAmount: 150.00,
            baseAmount: 150.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      
      // Maria - 2 comissões pendentes
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 11.97,
          currency: 'EUR',
          description: 'Comissão Encomenda #1002 | Cupão: VECINO_MARIA_15 | Cliente: joao.pereira@email.com | Valor: €79.80',
          status: 'PENDING',
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '1002',
            orderName: '#1002',
            orderDate: '2026-02-10T16:45:00Z',
            customerEmail: 'joao.pereira@email.com',
            totalAmount: 79.80,
            baseAmount: 79.80,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 18.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #1006 | Cupão: VECINO_MARIA_15 | Cliente: sofia.almeida@email.com | Valor: €120.00',
          status: 'PENDING',
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '1006',
            orderName: '#1006',
            orderDate: '2026-02-11T11:30:00Z',
            customerEmail: 'sofia.almeida@email.com',
            totalAmount: 120.00,
            baseAmount: 120.00,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      
      // Ana - 2 comissões pendentes
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 28.46,
          currency: 'EUR',
          description: 'Comissão Encomenda #1003 | Cupão: VECINO_ANA_10 | Cliente: pedro.costa@email.com | Valor: €237.20',
          status: 'PENDING',
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '1003',
            orderName: '#1003',
            orderDate: '2026-02-09T13:00:00Z',
            customerEmail: 'pedro.costa@email.com',
            totalAmount: 237.20,
            baseAmount: 237.20,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 32.40,
          currency: 'EUR',
          description: 'Comissão Encomenda #1009 | Cupão: VECINO_ANA_10 | Cliente: ines.martins@email.com | Valor: €270.00',
          status: 'PENDING',
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '1009',
            orderName: '#1009',
            orderDate: '2026-02-12T16:20:00Z',
            customerEmail: 'ines.martins@email.com',
            totalAmount: 270.00,
            baseAmount: 270.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
    ]);

    console.log(`✅ ${pendingCommissions.length} comissões PENDING criadas`);

    // Criar comissões PROCESSING (aprovadas, aguardam pagamento)
    console.log('\n2️⃣ A criar comissões PROCESSING (aprovadas)...');
    
    const processingCommissions = await Promise.all([
      // Joana - 2 aprovadas
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 9.50,
          currency: 'EUR',
          description: 'Comissão Encomenda #1010 | Cupão: VECINO_JOANA_10 | Cliente: rita.lopes@email.com | Valor: €95.00',
          status: 'PROCESSING',
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '1010',
            orderName: '#1010',
            orderDate: '2026-02-08T10:00:00Z',
            customerEmail: 'rita.lopes@email.com',
            totalAmount: 95.00,
            baseAmount: 95.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 13.20,
          currency: 'EUR',
          description: 'Comissão Encomenda #1011 | Cupão: VECINO_JOANA_10 | Cliente: marta.gomes@email.com | Valor: €132.00',
          status: 'PROCESSING',
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '1011',
            orderName: '#1011',
            orderDate: '2026-02-09T15:30:00Z',
            customerEmail: 'marta.gomes@email.com',
            totalAmount: 132.00,
            baseAmount: 132.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      
      // Maria - 1 aprovada
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 14.25,
          currency: 'EUR',
          description: 'Comissão Encomenda #1012 | Cupão: VECINO_MARIA_15 | Cliente: tiago.fernandes@email.com | Valor: €95.00',
          status: 'PROCESSING',
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '1012',
            orderName: '#1012',
            orderDate: '2026-02-07T09:45:00Z',
            customerEmail: 'tiago.fernandes@email.com',
            totalAmount: 95.00,
            baseAmount: 95.00,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      
      // Ana - 3 aprovadas
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 22.80,
          currency: 'EUR',
          description: 'Comissão Encomenda #1013 | Cupão: VECINO_ANA_10 | Cliente: catarina.ribeiro@email.com | Valor: €190.00',
          status: 'PROCESSING',
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '1013',
            orderName: '#1013',
            orderDate: '2026-02-06T14:20:00Z',
            customerEmail: 'catarina.ribeiro@email.com',
            totalAmount: 190.00,
            baseAmount: 190.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 19.20,
          currency: 'EUR',
          description: 'Comissão Encomenda #1014 | Cupão: VECINO_ANA_10 | Cliente: daniel.carvalho@email.com | Valor: €160.00',
          status: 'PROCESSING',
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '1014',
            orderName: '#1014',
            orderDate: '2026-02-07T11:00:00Z',
            customerEmail: 'daniel.carvalho@email.com',
            totalAmount: 160.00,
            baseAmount: 160.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 26.40,
          currency: 'EUR',
          description: 'Comissão Encomenda #1015 | Cupão: VECINO_ANA_10 | Cliente: beatriz.oliveira@email.com | Valor: €220.00',
          status: 'PROCESSING',
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '1015',
            orderName: '#1015',
            orderDate: '2026-02-08T16:45:00Z',
            customerEmail: 'beatriz.oliveira@email.com',
            totalAmount: 220.00,
            baseAmount: 220.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
    ]);

    console.log(`✅ ${processingCommissions.length} comissões PROCESSING criadas`);

    // Criar comissões PAID (já pagas)
    console.log('\n3️⃣ A criar comissões PAID (histórico)...');
    
    const paidCommissions = await Promise.all([
      // Joana - 2 pagas
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 10.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #998 | Cupão: VECINO_JOANA_10 | Cliente: luis.mendes@email.com | Valor: €100.00',
          status: 'PAID',
          paidAt: new Date('2026-02-05'),
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '998',
            orderName: '#998',
            orderDate: '2026-02-01T10:00:00Z',
            customerEmail: 'luis.mendes@email.com',
            totalAmount: 100.00,
            baseAmount: 100.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 7.50,
          currency: 'EUR',
          description: 'Comissão Encomenda #999 | Cupão: VECINO_JOANA_10 | Cliente: patricia.sousa@email.com | Valor: €75.00',
          status: 'PAID',
          paidAt: new Date('2026-02-05'),
          method: 'BANK_TRANSFER',
          reference: JSON.stringify({
            shopifyOrderId: '999',
            orderName: '#999',
            orderDate: '2026-02-02T14:30:00Z',
            customerEmail: 'patricia.sousa@email.com',
            totalAmount: 75.00,
            baseAmount: 75.00,
            commissionRate: 10,
            couponCode: 'VECINO_JOANA_10',
          }),
        }
      }),
      
      // Maria - 3 pagas
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 12.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #995 | Cupão: VECINO_MARIA_15 | Cliente: andre.silva@email.com | Valor: €80.00',
          status: 'PAID',
          paidAt: new Date('2026-02-04'),
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '995',
            orderName: '#995',
            orderDate: '2026-01-28T09:00:00Z',
            customerEmail: 'andre.silva@email.com',
            totalAmount: 80.00,
            baseAmount: 80.00,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 9.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #996 | Cupão: VECINO_MARIA_15 | Cliente: filipa.rodrigues@email.com | Valor: €60.00',
          status: 'PAID',
          paidAt: new Date('2026-02-04'),
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '996',
            orderName: '#996',
            orderDate: '2026-01-30T11:20:00Z',
            customerEmail: 'filipa.rodrigues@email.com',
            totalAmount: 60.00,
            baseAmount: 60.00,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 15.75,
          currency: 'EUR',
          description: 'Comissão Encomenda #997 | Cupão: VECINO_MARIA_15 | Cliente: ricardo.marques@email.com | Valor: €105.00',
          status: 'PAID',
          paidAt: new Date('2026-02-04'),
          method: 'MBWAY',
          reference: JSON.stringify({
            shopifyOrderId: '997',
            orderName: '#997',
            orderDate: '2026-01-31T15:45:00Z',
            customerEmail: 'ricardo.marques@email.com',
            totalAmount: 105.00,
            baseAmount: 105.00,
            commissionRate: 15,
            couponCode: 'VECINO_MARIA_15',
          }),
        }
      }),
      
      // Ana - 2 pagas
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 24.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #993 | Cupão: VECINO_ANA_10 | Cliente: joana.lima@email.com | Valor: €200.00',
          status: 'PAID',
          paidAt: new Date('2026-02-03'),
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '993',
            orderName: '#993',
            orderDate: '2026-01-25T10:30:00Z',
            customerEmail: 'joana.lima@email.com',
            totalAmount: 200.00,
            baseAmount: 200.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 18.00,
          currency: 'EUR',
          description: 'Comissão Encomenda #994 | Cupão: VECINO_ANA_10 | Cliente: miguel.torres@email.com | Valor: €150.00',
          status: 'PAID',
          paidAt: new Date('2026-02-03'),
          method: 'PAYPAL',
          reference: JSON.stringify({
            shopifyOrderId: '994',
            orderName: '#994',
            orderDate: '2026-01-27T14:00:00Z',
            customerEmail: 'miguel.torres@email.com',
            totalAmount: 150.00,
            baseAmount: 150.00,
            commissionRate: 12,
            couponCode: 'VECINO_ANA_10',
          }),
        }
      }),
    ]);

    console.log(`✅ ${paidCommissions.length} comissões PAID criadas`);

    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`   PENDING (Pendentes): ${pendingCommissions.length} comissões`);
    console.log(`   PROCESSING (Pagamentos): ${processingCommissions.length} comissões`);
    console.log(`   PAID (Pagas): ${paidCommissions.length} comissões`);
    console.log(`   TOTAL: ${pendingCommissions.length + processingCommissions.length + paidCommissions.length} comissões`);

    console.log('\n✅ Dados de teste adicionados com sucesso!');
    console.log('\n🚀 Vai a:');
    console.log('   https://vecinocustom.vercel.app/dashboard/commissions');
    console.log('   https://vecinocustom.vercel.app/dashboard/commissions/pending');
    console.log('   https://vecinocustom.vercel.app/dashboard/commissions/payments');
    console.log('   https://vecinocustom.vercel.app/dashboard/commissions/paid');

  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCommissionsTest();
