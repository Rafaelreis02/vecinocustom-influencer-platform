/**
 * GET /api/commissions
 * 
 * Lista todas as comissões (payments) com filtros opcionais
 * Query params:
 * - startDate: data inicial (ISO)
 * - endDate: data final (ISO)
 * - status: PENDING, PROCESSING, PAID, etc.
 * - influencerId: filtrar por influencer específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Filtros
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const influencerId = searchParams.get('influencerId');

    // Construir where clause
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    if (influencerId) {
      where.influencerId = influencerId;
    }

    // Buscar comissões
    const commissions = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            instagramHandle: true,
            tiktokHandle: true,
            paymentMethod: true,
          },
        },
      },
    });

    // Agrupar por influencer para calcular totais
    const influencerTotals = new Map();
    
    for (const commission of commissions) {
      const inf = commission.influencer;
      if (!influencerTotals.has(inf.id)) {
        influencerTotals.set(inf.id, {
          influencer: inf,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          count: 0,
        });
      }
      
      const data = influencerTotals.get(inf.id);
      data.totalAmount += commission.amount;
      data.count++;
      
      if (commission.status === 'PENDING') {
        data.pendingAmount += commission.amount;
      } else if (commission.status === 'PAID') {
        data.paidAmount += commission.amount;
      }
    }

    // Calcular totais gerais
    const totals = {
      total: commissions.reduce((sum, c) => sum + c.amount, 0),
      pending: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      paid: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
      count: commissions.length,
    };

    logger.info('[API] Commissions listed', { 
      count: commissions.length,
      filters: { startDate, endDate, status, influencerId }
    });

    return NextResponse.json(serializeBigInt({
      commissions,
      influencerSummaries: Array.from(influencerTotals.values()),
      totals,
    }));

  } catch (error) {
    logger.error('[API] Error listing commissions', { error });
    return handleApiError(error);
  }
}
