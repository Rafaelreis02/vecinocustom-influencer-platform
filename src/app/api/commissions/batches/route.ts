/**
 * GET /api/commissions/batches
 * 
 * Lista pagamentos agregados (PaymentBatch) por influencer
 * Query params:
 * - startDate: data inicial (ISO)
 * - endDate: data final (ISO)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir where clause
    const where: any = {};

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        // Usar início do dia para startDate
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.paidAt.gte = start;
      }
      if (endDate) {
        // Usar fim do dia para endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paidAt.lte = end;
      }
    }

    // Buscar batches
    const batches = await prisma.paymentBatch.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            instagramHandle: true,
            tiktokHandle: true,
          },
        },
      },
    });

    // Calcular totais
    const totalPaid = batches.reduce((sum, b) => sum + b.totalAmount, 0);

    logger.info('[API] Payment batches listed', { 
      count: batches.length,
      totalPaid,
      filters: { startDate, endDate }
    });

    return NextResponse.json(serializeBigInt({
      batches,
      totalPaid,
      count: batches.length,
    }));

  } catch (error) {
    logger.error('[API] Error listing payment batches', { error });
    return handleApiError(error);
  }
}
