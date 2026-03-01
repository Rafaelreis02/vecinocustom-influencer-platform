import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/funnel
 * 
 * Retorna o funnel de conversão de influencers:
 * - Total em prospeção
 * - Contactados
 * - Proposta enviada (COUNTER_PROPOSAL)
 * - Aceites (AGREED e seguintes)
 * - Comissões geradas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar contagem de influencers por status
    const influencersByStatus = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM influencers
      GROUP BY status
    `;

    // Converter para objeto
    const statusCounts: Record<string, number> = {};
    (influencersByStatus as any[]).forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });

    // Funnel stages
    const funnel = {
      // Fase 1: Prospeção (todos os que não estão cancelados)
      prospeccao: 
        (statusCounts['UNKNOWN'] || 0) +
        (statusCounts['SUGGESTION'] || 0) +
        (statusCounts['IMPORT_PENDING'] || 0) +
        (statusCounts['CONTACTED'] || 0),
      
      // Fase 2: Contactados
      contactados: statusCounts['CONTACTED'] || 0,
      
      // Fase 3: Proposta enviada (em negociação)
      propostaEnviada: 
        (statusCounts['ANALYZING'] || 0) +
        (statusCounts['COUNTER_PROPOSAL'] || 0),
      
      // Fase 4: Aceites (parceria ativa)
      aceites: 
        (statusCounts['AGREED'] || 0) +
        (statusCounts['PRODUCT_SELECTION'] || 0) +
        (statusCounts['CONTRACT_PENDING'] || 0) +
        (statusCounts['SHIPPED'] || 0),
      
      // Fase 5: Concluídos
      concluidos: statusCounts['COMPLETED'] || 0,
      
      // Comissões geradas
      comissoesGeradas: 0, // Será atualizado abaixo
    };

    // Buscar comissões pagas
    const commissionStats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT "influencerId") as influencers_with_commissions,
        SUM(amount) as total_commissions
      FROM payments
      WHERE status = 'PAID'
    `;

    if (Array.isArray(commissionStats) && commissionStats.length > 0) {
      funnel.comissoesGeradas = parseInt(commissionStats[0].influencers_with_commissions) || 0;
    }

    // Calcular taxas de conversão
    const conversionRates = {
      contactados: funnel.prospeccao > 0 
        ? ((funnel.contactados / funnel.prospeccao) * 100).toFixed(1)
        : '0.0',
      propostaEnviada: funnel.contactados > 0
        ? ((funnel.propostaEnviada / funnel.contactados) * 100).toFixed(1)
        : '0.0',
      aceites: funnel.propostaEnviada > 0
        ? ((funnel.aceites / funnel.propostaEnviada) * 100).toFixed(1)
        : '0.0',
      concluidos: funnel.aceites > 0
        ? ((funnel.concluidos / funnel.aceites) * 100).toFixed(1)
        : '0.0',
    };

    logger.info('[API] Funnel metrics fetched', { funnel });

    return NextResponse.json({
      success: true,
      data: {
        funnel,
        conversionRates,
        totalInfluencers: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    logger.error('[API] Error fetching funnel metrics', { error });
    return NextResponse.json(
      { error: 'Failed to fetch funnel metrics' },
      { status: 500 }
    );
  }
}
