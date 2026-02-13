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
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
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
          },
        },
      },
    });

    // Parse order details from reference field (JSON)
    const enrichedCommissions = commissions.map(comm => {
      let orderDetails = null;
      try {
        if (comm.reference) {
          orderDetails = JSON.parse(comm.reference);
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
      
      return {
        ...comm,
        orderDetails,
        // Extract order info for display
        orderNumber: orderDetails?.orderName || null,
        orderDate: orderDetails?.orderDate || null,
        customerEmail: orderDetails?.customerEmail || null,
        baseAmount: orderDetails?.baseAmount || null,
        commissionRate: orderDetails?.commissionRate || null,
        couponCode: orderDetails?.couponCode || null,
      };
    });

    // Agrupar por influencer para calcular totais
    const influencerTotals = new Map();
    
    for (const commission of enrichedCommissions) {
      const inf = commission.influencer;
      if (!influencerTotals.has(inf.id)) {
        influencerTotals.set(inf.id, {
          influencer: inf,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          count: 0,
          commissions: [], // Store individual commissions
        });
      }
      
      const data = influencerTotals.get(inf.id);
      data.totalAmount += commission.amount;
      data.count++;
      data.commissions.push(commission); // Add to list
      
      if (commission.status === 'PENDING') {
        data.pendingAmount += commission.amount;
      } else if (commission.status === 'PAID') {
        data.paidAmount += commission.amount;
      }
    }

    // Calcular totais gerais
    const totals = {
      total: enrichedCommissions.reduce((sum, c) => sum + c.amount, 0),
      pending: enrichedCommissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      paid: enrichedCommissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
      count: enrichedCommissions.length,
    };

    logger.info('[API] Commissions listed', { 
      count: enrichedCommissions.length,
      filters: { startDate, endDate, status, influencerId }
    });

    return NextResponse.json(serializeBigInt({
      commissions: enrichedCommissions,
      influencerSummaries: Array.from(influencerTotals.values()),
      totals,
    }));

  } catch (error) {
    logger.error('[API] Error listing commissions', { error });
    return handleApiError(error);
  }
}
