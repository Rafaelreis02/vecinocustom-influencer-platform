/**
 * Script para criar PaymentBatches de teste (histórico de pagamentos)
 * 
 * Executar: npx ts-node scripts/seed-payment-batches.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedPaymentBatches() {
  console.log('🌱 A criar histórico de pagamentos...\n');

  try {
    // Buscar influencers
    const influencers = await prisma.influencer.findMany({
      take: 3,
      select: { id: true, name: true }
    });

    if (influencers.length < 3) {
      console.log('❌ Precisas de pelo menos 3 influencers.');
      return;
    }

    console.log('✅ Influencers encontrados:', influencers.map(i => i.name));

    // Criar PaymentBatches (pagamentos já efetuados)
    console.log('\n1️⃣ A criar histórico de pagamentos...');
    
    const batches = await Promise.all([
      // Joana - Pagamento de 15/01/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[0].id,
          totalAmount: 45.50,
          currency: 'EUR',
          paidAt: new Date('2026-01-15'),

          reference: 'Transferência #12345',
          commissionIds: JSON.stringify(['comm-001', 'comm-002', 'comm-003']),
        }
      }),
      
      // Joana - Pagamento de 01/02/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[0].id,
          totalAmount: 32.80,
          currency: 'EUR',
          paidAt: new Date('2026-02-01'),

          reference: 'Transferência #12346',
          commissionIds: JSON.stringify(['comm-004', 'comm-005']),
        }
      }),
      
      // Maria - Pagamento de 20/01/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[1].id,
          totalAmount: 28.50,
          currency: 'EUR',
          paidAt: new Date('2026-01-20'),

          reference: 'MBWay 912345678',
          commissionIds: JSON.stringify(['comm-006', 'comm-007']),
        }
      }),
      
      // Maria - Pagamento de 05/02/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[1].id,
          totalAmount: 41.25,
          currency: 'EUR',
          paidAt: new Date('2026-02-05'),

          reference: 'MBWay 912345678',
          commissionIds: JSON.stringify(['comm-008', 'comm-009', 'comm-010']),
        }
      }),
      
      // Ana - Pagamento de 10/01/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[2].id,
          totalAmount: 85.00,
          currency: 'EUR',
          paidAt: new Date('2026-01-10'),

          reference: 'PayPal ID: 8XJ2M9',
          commissionIds: JSON.stringify(['comm-011', 'comm-012']),
        }
      }),
      
      // Ana - Pagamento de 25/01/2026
      prisma.paymentBatch.create({
        data: {
          influencerId: influencers[2].id,
          totalAmount: 112.40,
          currency: 'EUR',
          paidAt: new Date('2026-01-25'),

          reference: 'PayPal ID: 9K3N1P',
          commissionIds: JSON.stringify(['comm-013', 'comm-014', 'comm-015']),
        }
      }),
    ]);

    console.log(`✅ ${batches.length} pagamentos criados`);

    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`   Total de pagamentos: ${batches.length}`);
    console.log(`   Valor total: €${batches.reduce((sum, b) => sum + b.totalAmount, 0).toFixed(2)}`);

    console.log('\n✅ Histórico de pagamentos criado com sucesso!');
    console.log('\n🚀 Vai a: https://vecinocustom.vercel.app/dashboard/commissions/paid');

  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPaymentBatches();
