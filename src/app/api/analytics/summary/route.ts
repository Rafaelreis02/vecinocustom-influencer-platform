/**
 * GET /api/analytics/summary
 * 
 * Retorna KPIs principais:
 * - Total de vendas
 * - Total de comissões (pagas)
 * - ROI percentagem
 * - Contas de influencers, cupões, vendas
 * - Taxa de conversão
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validar datas
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Formato de data inválido (use ISO: 2026-02-13)' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'endDate deve ser após startDate' },
        { status: 400 }
      );
    }

    logger.info('[Analytics] Summary request', { startDate, endDate });

    // 1. Total de vendas (sum de totalSales dos coupons)
    const salesData = await prisma.coupon.aggregate({
      _sum: {
        totalSales: true,
      },
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalSales = salesData._sum.totalSales || 0;

    // 2. Total de comissões pagas (sum de payments com status PAID)
    const commissionsData = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalCommissions = commissionsData._sum.amount || new Decimal(0);
    const totalCommissionsNum = typeof totalCommissions === 'number' 
      ? totalCommissions 
      : parseFloat(totalCommissions.toString());

    // 3. ROI percentage
    const roiPercentage = totalSales > 0 
      ? (totalCommissionsNum / totalSales) * 100 
      : 0;

    // 4. Contar influencers ativos (com cupões no período)
    const activeInfluencers = await prisma.influencer.count({
      where: {
        coupons: {
          some: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    // 5. Contar cupões ativos
    const activeCoupons = await prisma.coupon.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // 6. Contar total de vendas/orders (usageCount)
    const totalOrdersData = await prisma.coupon.aggregate({
      _sum: {
        usageCount: true,
      },
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalOrders = totalOrdersData._sum.usageCount || 0;

    // 7. Taxa de conversão (simplificada: orders / clicks estimados)
    // Para agora: usageCount / totalSales * 100
    const conversionRate = totalSales > 0 
      ? (totalOrders / totalSales * 100) 
      : 0;

    const response = {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      metrics: {
        totalSales: parseFloat(totalSales.toString()),
        totalCommissions: parseFloat(totalCommissionsNum.toString()),
        roiPercentage: parseFloat(roiPercentage.toFixed(2)),
        activeInfluencers,
        activeCoupons,
        totalOrders,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
    };

    logger.info('[Analytics] Summary calculated', response.metrics);

    return NextResponse.json(response);

  } catch (error) {
    logger.error('[Analytics] Summary error', { error });
    return NextResponse.json(
      { error: 'Erro ao calcular resumo' },
      { status: 500 }
    );
  }
}
