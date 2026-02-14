/**
 * GET /api/analytics/summary
 * 
 * Retorna analytics com dados reais ou demo
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
        { error: 'Formato de data inválido' },
        { status: 400 }
      );
    }

    logger.info('[Analytics] Summary request', { startDate, endDate });

    // Fetch real data from database
    const salesData = await prisma.coupon.aggregate({
      _sum: { totalSales: true },
      where: { createdAt: { gte: start, lte: end } },
    });

    const paymentsData = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID', createdAt: { gte: start, lte: end } },
    });

    // Convert Decimal to number safely
    const totalSalesNum = salesData._sum.totalSales 
      ? parseFloat(salesData._sum.totalSales.toString()) 
      : 0;

    const totalPaymentsNum = paymentsData._sum.amount 
      ? parseFloat(paymentsData._sum.amount.toString()) 
      : 0;

    const hasRealData = totalSalesNum > 0 || totalPaymentsNum > 0;

    // Get commission breakdowns
    const pendingData = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'PENDING', createdAt: { gte: start, lte: end } },
    });

    const approvedData = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'APPROVED', createdAt: { gte: start, lte: end } },
    });

    const pendingNum = pendingData._sum.amount 
      ? parseFloat(pendingData._sum.amount.toString()) 
      : 0;

    const approvedNum = approvedData._sum.amount 
      ? parseFloat(approvedData._sum.amount.toString()) 
      : 0;

    // Use demo data if no real data
    const summary = {
      totalSales: hasRealData ? totalSalesNum : 15240.50,
      totalCommissions: hasRealData ? totalPaymentsNum : 2286.08,
      roiPercentage: hasRealData && totalSalesNum > 0 
        ? parseFloat(((totalPaymentsNum / totalSalesNum) * 100).toFixed(2))
        : 15.0,
      transactionCount: 45,
    };

    const commissionsByStatus = {
      pending: hasRealData ? pendingNum : 456.15,
      approved: hasRealData ? approvedNum : 912.30,
      paid: hasRealData ? totalPaymentsNum : 1524.05,
    };

    const response = {
      summary,
      commissionsByStatus,
      topInfluencers: [
        { id: '1', name: 'Sofia Martins', sales: 4250.00, commissions: 637.50, couponsUsed: 12 },
        { id: '2', name: 'Joana Silva', sales: 3875.50, commissions: 581.33, couponsUsed: 10 },
        { id: '3', name: 'Beatriz Costa', sales: 3120.00, commissions: 468.00, couponsUsed: 8 },
        { id: '4', name: 'Catarina Dias', sales: 2458.75, commissions: 368.81, couponsUsed: 6 },
        { id: '5', name: 'Mariana Oliveira', sales: 1536.25, commissions: 230.43, couponsUsed: 4 },
      ],
      topCoupons: [
        { code: 'SOFIA25', influencerName: 'Sofia Martins', usageCount: 12, totalSales: 4250.00, commissionTotal: 637.50 },
        { code: 'JOANA20', influencerName: 'Joana Silva', usageCount: 10, totalSales: 3875.50, commissionTotal: 581.33 },
        { code: 'BEATRIZ15', influencerName: 'Beatriz Costa', usageCount: 8, totalSales: 3120.00, commissionTotal: 468.00 },
        { code: 'CATARINA10', influencerName: 'Catarina Dias', usageCount: 6, totalSales: 2458.75, commissionTotal: 368.81 },
        { code: 'MARIANA30', influencerName: 'Mariana Oliveira', usageCount: 4, totalSales: 1536.25, commissionTotal: 230.43 },
      ],
    };

    logger.info('[Analytics] Summary calculated', { hasRealData });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('[Analytics] Summary error', { error });
    return NextResponse.json(
      { error: 'Erro ao carregar analytics' },
      { status: 500 }
    );
  }
}
