/**
 * POST /api/emails/auto-link
 * 
 * Associa automaticamente todos os emails de um remetente a um influencer.
 * Chamado quando um influencer é manualmente associado a um email.
 */

import { NextResponse } from 'next/server';
import { autoLinkEmailsBySender, fixEmailInfluencerConsistency } from '@/lib/email-auto-link';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderEmail, influencerId, fixConsistency } = body;

    // Modo de correção de consistência
    if (fixConsistency) {
      const result = await fixEmailInfluencerConsistency();
      return NextResponse.json({
        success: true,
        mode: 'consistency-fix',
        ...result
      });
    }

    // Validação
    if (!senderEmail || !influencerId) {
      return NextResponse.json(
        { error: 'senderEmail e influencerId são obrigatórios' },
        { status: 400 }
      );
    }

    // Executar auto-link
    const result = await autoLinkEmailsBySender(senderEmail, influencerId);

    logger.info('[API] Auto-link completed', { 
      senderEmail, 
      influencerId, 
      ...result 
    });

    return NextResponse.json({
      success: true,
      senderEmail,
      influencerId,
      ...result
    });

  } catch (error) {
    logger.error('[API] Auto-link failed', { error });
    return handleApiError(error);
  }
}

/**
 * GET /api/emails/auto-link
 * 
 * Verifica o estado de auto-link para um email específico.
 * Retorna quantos emails seriam afetados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const senderEmail = searchParams.get('senderEmail');
    const influencerId = searchParams.get('influencerId');

    if (!senderEmail) {
      return NextResponse.json(
        { error: 'senderEmail é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar todos os emails deste remetente
    const { prisma } = await import('@/lib/prisma');
    const { extractEmail } = await import('@/lib/email-auto-link');
    
    const cleanEmail = extractEmail(senderEmail);
    
    const emails = await prisma.email.findMany({
      where: {
        from: {
          contains: cleanEmail,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        subject: true,
        influencerId: true,
        receivedAt: true
      },
      orderBy: { receivedAt: 'desc' }
    });

    const unlinked = emails.filter(e => e.influencerId === null);
    const linkedToOther = influencerId 
      ? emails.filter(e => e.influencerId !== null && e.influencerId !== influencerId)
      : [];
    const alreadyLinked = influencerId
      ? emails.filter(e => e.influencerId === influencerId)
      : [];

    return NextResponse.json({
      senderEmail: cleanEmail,
      totalEmails: emails.length,
      unlinked: unlinked.length,
      linkedToOther: linkedToOther.length,
      alreadyLinked: alreadyLinked.length,
      wouldBeLinked: unlinked.length + linkedToOther.length,
      emails: emails.map(e => ({
        id: e.id,
        subject: e.subject,
        status: e.influencerId === null 
          ? 'unlinked' 
          : e.influencerId === influencerId 
            ? 'linked-to-target' 
            : 'linked-to-other'
      }))
    });

  } catch (error) {
    logger.error('[API] Auto-link check failed', { error });
    return handleApiError(error);
  }
}
