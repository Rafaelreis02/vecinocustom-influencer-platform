import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/temporal
 * 
 * Retorna métricas temporais:
 * - Melhor dia da semana para contactar
 * - Tempo médio entre contacto e resposta
 * - Tempo médio entre contacto e publicação
 * - Influencers recentemente ativos
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Melhor dia da semana para contactar (baseado em respostas)
    const bestDayToContact = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM "sentAt") as day_of_week,
        COUNT(*) as total_sent,
        SUM(CASE WHEN status != 'PENDING' THEN 1 ELSE 0 END) as responses,
        ROUND(
          100.0 * SUM(CASE WHEN status != 'PENDING' THEN 1 ELSE 0 END) / COUNT(*),
          1
        ) as response_rate
      FROM influencer_contacts
      GROUP BY EXTRACT(DOW FROM "sentAt")
      ORDER BY response_rate DESC
      LIMIT 1
    `;

    const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const bestDay = Array.isArray(bestDayToContact) && bestDayToContact.length > 0
      ? daysOfWeek[parseInt(bestDayToContact[0].day_of_week)]
      : null;

    // Tempo médio de resposta (em horas)
    const avgResponseTime = await prisma.$queryRaw`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM ("responseAt" - "sentAt")) / 3600
        ) as avg_hours
      FROM influencer_contacts
      WHERE "responseAt" IS NOT NULL
        AND status != 'PENDING'
    `;

    const avgResponseHours = Array.isArray(avgResponseTime) && avgResponseTime[0]?.avg_hours
      ? Math.round(parseFloat(avgResponseTime[0].avg_hours))
      : null;

    // Tempo médio entre parceria aceite e envio (em dias)
    const avgPartnershipTime = await prisma.$queryRaw`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (updatedAt - createdAt)) / 86400
        ) as avg_days
      FROM partnership_workflows
      WHERE status IN ('SHIPPED', 'COMPLETED')
    `;

    const avgPartnershipDays = Array.isArray(avgPartnershipTime) && avgPartnershipTime[0]?.avg_days
      ? Math.round(parseFloat(avgPartnershipTime[0].avg_days))
      : null;

    // Influencers recentemente ativos (últimos 7 dias)
    const recentActivity = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i."instagramHandle",
        i."avatarUrl",
        MAX(ic."sentAt") as last_contact,
        MAX(ic."responseAt") as last_response
      FROM influencers i
      LEFT JOIN influencer_contacts ic ON i.id = ic."influencerId"
      WHERE ic."sentAt" >= NOW() - INTERVAL '7 days'
         OR ic."responseAt" >= NOW() - INTERVAL '7 days'
      GROUP BY i.id, i.name, i."instagramHandle", i."avatarUrl"
      ORDER BY GREATEST(MAX(ic."sentAt"), MAX(ic."responseAt")) DESC
      LIMIT 10
    `;

    // Influencers sem atividade há +14 dias (stale)
    const staleInfluencers = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.name,
        i."instagramHandle",
        i.status,
        MAX(ic."sentAt") as last_contact,
        EXTRACT(DAY FROM (NOW() - MAX(ic."sentAt"))) as days_since_contact
      FROM influencers i
      LEFT JOIN influencer_contacts ic ON i.id = ic."influencerId"
      WHERE i.status = 'CONTACTED'
        AND (ic."sentAt" IS NULL OR ic."sentAt" < NOW() - INTERVAL '14 days')
      GROUP BY i.id, i.name, i."instagramHandle", i.status
      ORDER BY MAX(ic."sentAt") ASC NULLS FIRST
      LIMIT 10
    `;

    // Distribuição de respostas por hora do dia
    const responsesByHour = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "responseAt") as hour,
        COUNT(*) as response_count
      FROM influencer_contacts
      WHERE "responseAt" IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM "responseAt")
      ORDER BY hour
    `;

    logger.info('[API] Temporal metrics fetched');

    return NextResponse.json({
      success: true,
      data: {
        bestDayToContact: bestDay,
        avgResponseTime: avgResponseHours,
        avgPartnershipDuration: avgPartnershipDays,
        recentActivity: recentActivity || [],
        staleInfluencers: staleInfluencers || [],
        responsesByHour: responsesByHour || [],
      },
    });
  } catch (error) {
    logger.error('[API] Error fetching temporal metrics', { error });
    return NextResponse.json(
      { error: 'Failed to fetch temporal metrics' },
      { status: 500 }
    );
  }
}
