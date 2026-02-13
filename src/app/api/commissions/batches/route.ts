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
        where.paidAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.paidAt.lte = new Date(endDate);
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
            paymentMethod: true,
          },
        },
      },
    });

    // Calcular totais
    const totalPaid = batches.reduce((sum, b) => sum + b.totalAmount, 0);

    logger.info('[API] Payment batches listed', { 
      count: batches.length,
      totalPaid,
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
