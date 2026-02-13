/**
 * Script para adicionar dados de teste completos
 * Influencers + Cupões + Comissões
 * 
 * Executar: npx ts-node scripts/seed-complete.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedComplete() {
  console.log('🌱 A adicionar dados de teste...\n');

  try {
    // Buscar um user para ser o createdBy
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ Nenhum user encontrado na base de dados.');
      console.log('   Cria um user primeiro ou executa o seed.');
      return;
    }
    console.log(`✅ User encontrado: ${user.email}\n`);

    // 1. Criar 3 influencers de teste
    console.log('1️⃣ A criar influencers...');
    
    const influencers = await Promise.all([
      prisma.influencer.create({
        data: {
          name: 'Joana Silva',
          email: 'joana.silva@email.com',
          instagramHandle: '@joanasilva',
          instagramFollowers: 45000,
          tiktokHandle: '@joanasilva',
          tiktokFollowers: 120000,
          status: 'AGREED',
          paymentMethod: 'BANK_TRANSFER',
          tier: 'MICRO',
          createdById: user.id,
        }
      }),
      prisma.influencer.create({
        data: {
          name: 'Maria Costa',
          email: 'maria.costa@email.com',
          instagramHandle: '@mariacosta',
          instagramFollowers: 89000,
          status: 'PRODUCT_SELECTION',
          paymentMethod: 'MBWAY',
          tier: 'MICRO',
          createdById: user.id,
        }
      }),
      prisma.influencer.create({
        data: {
          name: 'Ana Pereira',
          email: 'ana.pereira@email.com',
          tiktokHandle: '@anapereira',
          tiktokFollowers: 250000,
          status: 'SHIPPED',
          paymentMethod: 'PAYPAL',
          tier: 'MACRO',
          createdById: user.id,
        }
      })
    ]);

    console.log(`✅ ${influencers.length} influencers criados:`);
    influencers.forEach(i => console.log(`   • ${i.name} (${i.email})`));

    // 2. Criar cupões para cada influencer
    console.log('\n2️⃣ A criar cupões...');
    
    const coupons = await Promise.all([
      prisma.coupon.create({
        data: {
          code: 'VECINO_JOANA_10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          commissionRate: 10,
          influencerId: influencers[0].id,
          usageCount: 15,
          totalSales: 1255.00,
          totalOrders: 15,
        }
      }),
      prisma.coupon.create({
        data: {
          code: 'VECINO_MARIA_15',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          commissionRate: 10,
          influencerId: influencers[1].id,
          usageCount: 8,
          totalSales: 598.50,
          totalOrders: 8,
        }
      }),
      prisma.coupon.create({
        data: {
          code: 'VECINO_ANA_10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          commissionRate: 12,
          influencerId: influencers[2].id,
          usageCount: 32,
          totalSales: 2847.00,
          totalOrders: 32,
        }
      })
    ]);

    console.log(`✅ ${coupons.length} cupões criados:`);
    coupons.forEach(c => console.log(`   • ${c.code} - ${c.discountValue}% desconto`));

    // 3. Criar comissões (payments)
    console.log('\n3️⃣ A criar comissões...');
    
    const commissions = await Promise.all([
      // Comissões da Joana
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 125.50,
          currency: 'EUR',
          description: 'Comissão cupão VECINO_JOANA_10 (15 vendas)',
          status: 'PENDING',
          method: 'BANK_TRANSFER',
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[0].id,
          amount: 89.30,
          currency: 'EUR',
          description: 'Comissão cupão VECINO_JOANA_10 (vendas extra)',
          status: 'PENDING',
          method: 'BANK_TRANSFER',
        }
      }),
      
      // Comissões da Maria
      prisma.payment.create({
        data: {
          influencerId: influencers[1].id,
          amount: 59.85,
          currency: 'EUR',
          description: 'Comissão cupão VECINO_MARIA_15 (8 vendas)',
          status: 'PENDING',
          method: 'MBWAY',
        }
      }),
      
      // Comissões da Ana
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 341.64,
          currency: 'EUR',
          description: 'Comissão cupão VECINO_ANA_10 (32 vendas)',
          status: 'PENDING',
          method: 'PAYPAL',
        }
      }),
      prisma.payment.create({
        data: {
          influencerId: influencers[2].id,
          amount: 125.00,
          currency: 'EUR',
          description: 'Bónus de performance - Janeiro',
          status: 'PAID',
          method: 'PAYPAL',
          paidAt: new Date('2026-02-01'),
        }
      })
    ]);

    console.log(`✅ ${commissions.length} comissões criadas:`);
    commissions.forEach(c => {
      const status = c.status === 'PAID' ? '✓ Pago' : '⏳ Pendente';
      console.log(`   • ${c.description} - €${c.amount} (${status})`);
    });

    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`   Influencers: ${influencers.length}`);
    console.log(`   Cupões: ${coupons.length}`);
    console.log(`   Comissões: ${commissions.length}`);
    console.log(`   Total em comissões pendentes: €${commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`);
    console.log(`   Total em comissões pagas: €${commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`);

    console.log('\n✅ Dados de teste adicionados com sucesso!');
    console.log('\n🚀 Vai a:');
    console.log('   https://vecinocustom.vercel.app/dashboard/commissions');
    console.log('   https://vecinocustom.vercel.app/dashboard/influencers');

  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedComplete();
