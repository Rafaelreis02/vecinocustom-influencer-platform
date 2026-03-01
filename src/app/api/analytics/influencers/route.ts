import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/influencers
 * 
 * Retorna métricas detalhadas por influencer:
 * - ROI (quanto investimos vs quanto vendeu)
 * - Taxa de resposta
 * - Tempo médio de resposta
 * - Status atual
 * - Total de vendas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'sales'; // sales, roi, response

    // Buscar influencers com cupons e pagamentos
    const influencers = await prisma.influencer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        instagramHandle: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        coupons: {
          select: {
            code: true,
            totalSales: true,
            totalOrders: true,
            commissionRate: true,
            createdAt: true,
          },
        },
        partnerships: {
          select: {
            agreedPrice: true,
            status: true,
            createdAt: true,
          },
        },
        contacts: {
          select: {
            sentAt: true,
            responseAt: true,
            status: true,
          },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        emails: {
          select: {
            receivedAt: true,
          },
          orderBy: { receivedAt: 'desc' },
          take: 1,
        },
        payments: {
          where: { status: 'PAID' },
          select: {
            amount: true,
          },
        },
      },
      take: limit,
    });

    // Calcular métricas para cada influencer
    const metrics = influencers.map(inf => {
      // Total de vendas
      const totalSales = inf.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);
      const totalOrders = inf.coupons.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
      
      // Total pago em comissões
      const totalCommissions = inf.payments.reduce((sum, p) => sum + p.amount, 0);
      
      // Investimento (valor acordado nas parcerias concluídas ou enviadas)
      const totalInvestment = inf.partnerships
        .filter(p => p.status === 'COMPLETED' || p.currentStep >= 5)
        .reduce((sum, p) => sum + (p.agreedPrice || 0), 0);
      
      // ROI = (Vendas - Investimento - Comissões) / Investimento * 100
      const roi = totalInvestment > 0
        ? ((totalSales - totalInvestment - totalCommissions) / totalInvestment * 100)
        : 0;
      
      // Taxa de resposta
      const hasResponse = inf.contacts.length > 0 && inf.contacts[0].status !== 'PENDING';
      const responseTime = hasResponse && inf.contacts[0].responseAt && inf.contacts[0].sentAt
        ? Math.round((new Date(inf.contacts[0].responseAt).getTime() - new Date(inf.contacts[0].sentAt).getTime()) / (1000 * 60 * 60)) // horas
        : null;
      
      // Última atividade
      const lastActivity = inf.emails[0]?.receivedAt || inf.contacts[0]?.sentAt || inf.createdAt;
      const daysSinceActivity = Math.round((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: inf.id,
        name: inf.name,
        instagramHandle: inf.instagramHandle,
        avatarUrl: inf.avatarUrl,
        status: inf.status,
        totalSales,
        totalOrders,
        totalCommissions,
        totalInvestment,
        roi: parseFloat(roi.toFixed(1)),
        hasResponse,
        responseTime,
        daysSinceActivity,
        lastActivity,
      };
    });

    // Ordenar conforme solicitado
    if (sortBy === 'sales') {
      metrics.sort((a, b) => b.totalSales - a.totalSales);
    } else if (sortBy === 'roi') {
      metrics.sort((a, b) => b.roi - a.roi);
    } else if (sortBy === 'response') {
      metrics.sort((a, b) => (a.responseTime || 999) - (b.responseTime || 999));
    }

    logger.info('[API] Influencer metrics fetched', { count: metrics.length });

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('[API] Error fetching influencer metrics', { error });
    return NextResponse.json(
      { error: 'Failed to fetch influencer metrics' },
      { status: 500 }
    );
  }
}
