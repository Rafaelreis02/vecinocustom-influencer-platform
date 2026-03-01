import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/commissions-real
 * 
 * Calcula comissões reais baseadas nas vendas dos cupons
 * em vez de depender da tabela payments (que só atualiza com cron)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Construir filtro de data
    const dateFilter: any = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = new Date(start);
      if (end) dateFilter.createdAt.lte = new Date(end);
    }

    // Buscar todos os cupons com vendas e comissão definida
    const coupons = await prisma.coupon.findMany({
      where: {
        commissionRate: {
          not: null,
        },
        totalSales: {
          gt: 0,
        },
        ...dateFilter,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Calcular comissões
    const commissions = coupons.map(coupon => {
      const commissionRate = coupon.commissionRate || 0;
      const commissionAmount = (coupon.totalSales * commissionRate) / 100;
      
      return {
        id: coupon.id,
        influencerId: coupon.influencerId,
        influencer: coupon.influencer,
        couponCode: coupon.code,
        totalSales: coupon.totalSales,
        totalOrders: coupon.totalOrders,
        commissionRate,
        commissionAmount,
        status: 'PENDING', // Por defeito, até ser pago
        createdAt: coupon.createdAt,
      };
    });

    // Buscar pagamentos já realizados para marcar como pagos
    const paidPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
      },
      select: {
        influencerId: true,
        amount: true,
      },
    });

    // Criar mapa de pagamentos por influencer
    const paidMap = new Map();
    paidPayments.forEach(payment => {
      const current = paidMap.get(payment.influencerId) || 0;
      paidMap.set(payment.influencerId, current + payment.amount);
    });

    // Atualizar status das comissões
    const enrichedCommissions = commissions.map(comm => {
      const paidAmount = paidMap.get(comm.influencerId) || 0;
      const remainingToPay = comm.commissionAmount - paidAmount;
      
      if (remainingToPay <= 0) {
        return { ...comm, status: 'PAID', paidAmount: comm.commissionAmount };
      } else if (paidAmount > 0) {
        return { ...comm, status: 'PROCESSING', paidAmount };
      }
      
      return { ...comm, status: 'PENDING', paidAmount: 0 };
    });

    // Calcular estatísticas
    const stats = {
      total: enrichedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pending: enrichedCommissions
        .filter(c => c.status === 'PENDING')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      processing: enrichedCommissions
        .filter(c => c.status === 'PROCESSING')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      paid: enrichedCommissions
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      totalOrders: enrichedCommissions.reduce((sum, c) => sum + c.totalOrders, 0),
      totalInfluencers: new Set(enrichedCommissions.map(c => c.influencerId)).size,
    };

    // Top influencers por comissão
    const topInfluencers = Object.values(
      enrichedCommissions.reduce((acc: any, comm) => {
        const id = comm.influencerId;
        if (!acc[id]) {
          acc[id] = {
            influencerId: id,
            name: comm.influencer.name,
            avatarUrl: comm.influencer.avatarUrl,
            instagramHandle: comm.influencer.instagramHandle,
            totalCommission: 0,
            totalSales: 0,
            totalOrders: 0,
          };
        }
        acc[id].totalCommission += comm.commissionAmount;
        acc[id].totalSales += comm.totalSales;
        acc[id].totalOrders += comm.totalOrders;
        return acc;
      }, {})
    ).sort((a: any, b: any) => b.totalCommission - a.totalCommission);

    logger.info('[API] Real commissions calculated', { 
      totalCoupons: coupons.length,
      totalCommissions: enrichedCommissions.length,
      totalValue: stats.total,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        commissions: enrichedCommissions,
        topInfluencers: topInfluencers.slice(0, 10),
      },
    });
  } catch (error) {
    logger.error('[API] Error calculating real commissions', { error });
    return NextResponse.json(
      { error: 'Failed to calculate commissions' },
      { status: 500 }
    );
  }
}
