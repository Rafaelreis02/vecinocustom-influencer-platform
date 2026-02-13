/**
 * PATCH /api/commissions/[id]
 * 
 * Atualiza o status de uma comissão
 * Body: { status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED', paidAt?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAt, reference, method } = body;

    // Validar status
    const validStatuses = ['PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Buscar comissão atual
    const existing = await prisma.payment.findUnique({
      where: { id },
      include: {
        influencer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Comissão não encontrada' },
        { status: 404 }
      );
    }

    // Dados a atualizar
    const updateData: any = { status };
    
    if (status === 'PAID') {
      updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
      if (reference) updateData.reference = reference;
      if (method) updateData.method = method;
    }

    // Atualizar
    const updated = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    logger.info('[API] Commission status updated', {
      id,
      oldStatus: existing.status,
      newStatus: status,
      influencer: existing.influencer.name
    });

    return NextResponse.json(serializeBigInt({
      success: true,
      commission: updated,
      message: `Comissão ${status === 'PAID' ? 'aprovada e marcada como paga' : status === 'CANCELLED' ? 'rejeitada' : 'atualizada'} com sucesso`,
    }));

  } catch (error) {
    logger.error('[API] Error updating commission', { error });
    return handleApiError(error);
  }
}

/**
 * GET /api/commissions/[id]
 * 
 * Detalhes de uma comissão específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const commission = await prisma.payment.findUnique({
      where: { id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            instagramHandle: true,
            tiktokHandle: true,
            phone: true,
          },
        },
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: 'Comissão não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeBigInt({ commission }));

  } catch (error) {
    logger.error('[API] Error fetching commission', { error });
    return handleApiError(error);
  }
}
