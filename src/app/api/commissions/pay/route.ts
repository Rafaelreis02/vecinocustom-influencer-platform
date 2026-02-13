/**
 * POST /api/commissions/pay
 * 
 * Marca comissões como pagas
 * Body: { influencerId: string, commissionIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencerId, commissionIds } = body;

    if (!influencerId || !commissionIds || !Array.isArray(commissionIds)) {
      return NextResponse.json(
        { error: 'influencerId e commissionIds são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true, name: true, email: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer não encontrado' },
        { status: 404 }
      );
    }

    // Verificar que todas as comissões pertencem ao influencer e estão em PROCESSING
    const commissions = await prisma.payment.findMany({
      where: {
        id: { in: commissionIds },
        influencerId: influencerId,
        status: 'PROCESSING',
      },
    });

    if (commissions.length !== commissionIds.length) {
      return NextResponse.json(
        { error: 'Algumas comissões não foram encontradas ou não estão aprovadas' },
        { status: 400 }
      );
    }

    // Calcular total
    const totalPaid = commissions.reduce((sum, c) => sum + c.amount, 0);
    const now = new Date();

    // Criar o PaymentBatch (registo agregado do pagamento)
    const batch = await prisma.paymentBatch.create({
      data: {
        influencerId,
        totalAmount: totalPaid,
        currency: 'EUR',
        paidAt: now,
        method: influencer.paymentMethod || 'BANK_TRANSFER',
        commissionIds: JSON.stringify(commissionIds),
      },
    });

    // Atualizar todas as comissões para PAID
    const updatePromises = commissionIds.map(id =>
      prisma.payment.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: now,
          reference: JSON.stringify({ batchId: batch.id }), // Link para o batch
        },
      })
    );

    await Promise.all(updatePromises);

    logger.info('[API] Payments marked as paid', {
      influencerId,
      influencerName: influencer.name,
      count: commissionIds.length,
      totalPaid,
      batchId: batch.id,
    });

    return NextResponse.json(serializeBigInt({
      success: true,
      message: `${commissionIds.length} comissões marcadas como pagas`,
      totalPaid,
      paidAt: now,
      influencer: {
        id: influencer.id,
        name: influencer.name,
      },
    }));

  } catch (error) {
    logger.error('[API] Error processing payment', { error });
    return handleApiError(error);
  }
}
