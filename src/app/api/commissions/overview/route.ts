/**
 * GET /api/commissions/overview
 * 
 * Estatísticas de comissões para dashboard
 * Query params:
 * - start: data inicial (ISO)
 * - end: data final (ISO)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Construir where para data
    const dateFilter: any = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = new Date(start);
      if (end) dateFilter.createdAt.lte = new Date(end);
    }

    // Buscar todas as comissões no período
    const commissions = await prisma.payment.findMany({
      where: dateFilter,
    });

    // Calcular estatísticas
    const stats = {
      total: commissions.reduce((sum, c) => sum + c.amount, 0),
      pending: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      processing: commissions.filter(c => c.status === 'PROCESSING').reduce((sum, c) => sum + c.amount, 0),
      paid: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
      totalOrders: commissions.length,
      totalInfluencers: new Set(commissions.map(c => c.influencerId)).size,
    };

    logger.info('[API] Commission overview', { stats });

    return NextResponse.json(stats);

  } catch (error) {
    logger.error('[API] Error getting commission overview', { error });
    return handleApiError(error);
  }
}
