import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const campaigns = await prisma.campaign.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        influencers: {
          include: {
            influencer: {
              select: {
                id: true,
                name: true,
                tiktokHandle: true,
              },
            },
          },
        },
        videos: {
          select: {
            views: true,
            likes: true,
          },
        },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    logger.error('GET /api/campaigns failed', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CampaignCreateSchema.parse(body);

    const campaign = await prisma.campaign.create({
      data: {
        ...validated,
        createdById: 'system', // TODO: auth
      },
    });

    logger.info('Campaign created', { id: campaign.id });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    logger.error('POST /api/campaigns failed', error);
    return handleApiError(error);
  }
}
