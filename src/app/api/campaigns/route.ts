import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
            cost: true,
            influencerId: true,
            authorHandle: true,
          },
        },
      },
    });

    // Calculate stats for each campaign
    const campaignsWithStats = campaigns.map(campaign => {
      const totalViews = campaign.videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const spent = campaign.videos.reduce((sum, v) => sum + (v.cost || 0), 0);
      const videosCount = campaign.videos.length;
      
      // Count unique influencers (both registered and unique authorHandles)
      const influencerIds = new Set(
        campaign.videos
          .filter((v): v is typeof v & { influencerId: string } => v.influencerId !== null)
          .map(v => v.influencerId)
      );
      const authorHandles = new Set(
        campaign.videos
          .filter((v): v is typeof v & { authorHandle: string } => !v.influencerId && v.authorHandle !== null)
          .map(v => v.authorHandle)
      );
      const influencersCount = influencerIds.size + authorHandles.size;

      return {
        ...campaign,
        totalViews,
        spent,
        videosCount,
        influencersCount,
      };
    });

    return NextResponse.json(campaignsWithStats);
  } catch (error) {
    logger.error('GET /api/campaigns failed', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Converte strings vazias para null para evitar erros de validação
    const cleanBody = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
    );
    
    const validated = CampaignCreateSchema.parse(cleanBody);

    // Obter user da sessão ou fallback para o primeiro admin
    const session = await getServerSession(authOptions);
    let createdById = session?.user?.id;
    
    if (!createdById) {
      const firstUser = await prisma.user.findFirst();
      createdById = firstUser?.id || 'system'; 
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...validated,
        createdById: createdById as string,
      },
    });

    logger.info('Campaign created', { id: campaign.id });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    logger.error('POST /api/campaigns failed', error);
    return handleApiError(error);
  }
}
