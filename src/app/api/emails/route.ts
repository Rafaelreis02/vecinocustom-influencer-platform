/**
 * GET /api/emails - Listar todos os emails
 * POST /api/emails - Criar email manual (para testes)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');
    const search = searchParams.get('search');

    const where: any = {};

    if (influencerId) {
      where.influencerId = influencerId;
    }

    if (search) {
      where.OR = [
        { from: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            tiktokHandle: true,
            instagramHandle: true,
            fitScore: true,
            tier: true,
          },
        },
      },
    });

    return NextResponse.json(emails);
  } catch (error) {
    logger.error('GET /api/emails failed', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = await prisma.email.create({
      data: {
        from: body.from,
        to: body.to || 'brand@vecinocustom.com',
        subject: body.subject,
        body: body.body,
        htmlBody: body.htmlBody || null,
        gmailId: body.gmailId || null,
        gmailThreadId: body.gmailThreadId || null,
        attachments: body.attachments || [],
        labels: body.labels || [],
        receivedAt: body.receivedAt || new Date(),
        influencerId: body.influencerId || null,
      },
      include: {
        influencer: true,
      },
    });

    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    logger.error('POST /api/emails failed', error);
    return handleApiError(error);
  }
}
