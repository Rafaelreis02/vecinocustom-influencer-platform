/**
 * POST /api/seed/commissions
 * 
 * Adiciona 3 comissões de teste para influencers existentes.
 * Usar apenas em ambiente de desenvolvimento/teste.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    // Buscar influencers existentes
    const influencers = await prisma.influencer.findMany({
      take: 3,
      select: { id: true, name: true, email: true }
    });

    if (influencers.length < 3) {
      return NextResponse.json({
        success: false,
        error: `Só existem ${influencers.length} influencers. Precisas de pelo menos 3.`,
        influencers: influencers.map(i => ({ id: i.id, name: i.name }))
      }, { status: 400 });
    }

    // Criar 3 comissões de teste
    const commissions = [
      {
        influencerId: influencers[0].id,
        amount: 125.50,
        description: `Comissão cupão VECINO_${influencers[0].name.replace(/\s+/g, '_').toUpperCase()}_10 (15 vendas)`,
        status: 'PENDING'
      },
      {
        influencerId: influencers[1].id,
        amount: 89.75,
        description: `Comissão cupão VECINO_${influencers[1].name.replace(/\s+/g, '_').toUpperCase()}_15 (8 vendas)`,
        status: 'PENDING'
      },
      {
        influencerId: influencers[2].id,
        amount: 245.00,
        description: `Comissão cupão VECINO_${influencers[2].name.replace(/\s+/g, '_').toUpperCase()}_10 (22 vendas)`,
        status: 'PENDING'
      }
    ];

    const created = [];
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
      created.push({
        id: payment.id,
        influencer: influencers.find(i => i.id === comm.influencerId)?.name,
        amount: comm.amount,
        description: comm.description
      });
    }

    logger.info('Test commissions created', { count: created.length });

    return NextResponse.json({
      success: true,
      message: '3 comissões de teste adicionadas com sucesso!',
      commissions: created
    });

  } catch (error) {
    logger.error('Error creating test commissions', { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * GET /api/seed/commissions
 * 
 * Apenas verifica influencers existentes (não cria nada)
 */
export async function GET() {
  try {
    const influencers = await prisma.influencer.findMany({
      take: 3,
      select: { id: true, name: true }
    });

    return NextResponse.json({
      influencers: influencers.map(i => ({ id: i.id, name: i.name })),
      canCreate: influencers.length >= 3
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar influencers' }, { status: 500 });
  }
}
