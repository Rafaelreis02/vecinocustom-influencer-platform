/**
 * Script para adicionar comissões de teste
 * Executar via: npx ts-node scripts/add-test-commissions.ts
 */

import { prisma } from '../src/lib/prisma';

async function addTestCommissions() {
  try {
    // Buscar influencers existentes
    const influencers = await prisma.influencer.findMany({
      take: 3,
      select: { id: true, name: true, email: true }
    });

    if (influencers.length < 3) {
      console.log('Só existem', influencers.length, 'influencers. Precisas de pelo menos 3.');
      console.log('Influencers encontrados:', influencers.map(i => i.name));
      return;
    }

    console.log('Influencers encontrados:', influencers.map(i => i.name));

    // Criar 3 comissões de teste
    const commissions = [
      {
        influencerId: influencers[0].id,
        amount: 125.50,
        description: 'Comissão cupão VECINO_JOAO_10 (15 vendas)',
        status: 'PENDING'
      },
      {
        influencerId: influencers[1].id,
        amount: 89.75,
        description: 'Comissão cupão VECINO_MARIA_15 (8 vendas)',
        status: 'PENDING'
      },
      {
        influencerId: influencers[2].id,
        amount: 245.00,
        description: 'Comissão cupão VECINO_ANA_10 (22 vendas)',
        status: 'PENDING'
      }
    ];

    for (const comm of commissions) {
      const payment = await prisma.payment.create({
        data: {
          influencerId: comm.influencerId,
          amount: comm.amount,
          currency: 'EUR',
          description: comm.description,
          status: comm.status as any,
          method: 'BANK_TRANSFER'
        }
      });
      console.log(`✅ Comissão criada: ${comm.description} - €${comm.amount}`);
    }

    console.log('\n✅ 3 comissões de teste adicionadas com sucesso!');
    console.log('Vai a /dashboard/commissions para ver.');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCommissions();
