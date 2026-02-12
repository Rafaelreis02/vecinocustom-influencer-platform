import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { InfluencerCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/influencers - Listar influencers com pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Prisma.InfluencerWhereInput = {};

    if (status) {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { instagramHandle: { contains: search, mode: 'insensitive' } },
        { tiktokHandle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [influencers, total] = await Promise.all([
      prisma.influencer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          phone: true,
          instagramHandle: true,
          instagramFollowers: true,
          tiktokHandle: true,
          tiktokFollowers: true,
          status: true,
          engagementRate: true,
          fitScore: true,
          estimatedPrice: true,
          tags: true,
          createdAt: true,
          videos: {
            select: {
              views: true,
              likes: true,
              comments: true,
              shares: true,
            },
            take: 10,
          },
          campaigns: {
            select: {
              campaign: {
                select: {
                  name: true,
                  status: true,
                },
              },
            },
          },
          coupons: {
            select: {
              code: true,
              usageCount: true,
              totalSales: true,
            },
          },
        },
      }),
      prisma.influencer.count({ where }),
    ]);

    // Calcular estatísticas agregadas
    const influencersWithStats = influencers.map((inf) => {
      const totalViews = inf.videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalLikes = inf.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
      const totalComments = inf.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
      const totalShares = inf.videos.reduce((sum, v) => sum + (v.shares || 0), 0);
      const totalRevenue = inf.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);
      
      const totalFollowers = (inf.instagramFollowers || 0) + (inf.tiktokFollowers || 0);
      
      const engagement = inf.engagementRate !== null && inf.engagementRate !== undefined
        ? inf.engagementRate 
        : (totalFollowers > 0 
            ? parseFloat((((totalLikes + totalComments + totalShares) / totalFollowers) * 100).toFixed(2))
            : 0);

      return serializeBigInt({
        ...inf,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalRevenue,
        engagement,
        activeCampaigns: inf.campaigns.filter(c => c.campaign.status === 'ACTIVE').length,
        activeCoupons: inf.coupons.filter(c => c.usageCount > 0).length,
      });
    });

    return NextResponse.json({
      data: influencersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('GET /api/influencers failed', error);
    return handleApiError(error);
  }
}

// POST /api/influencers - Criar novo influencer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validated = InfluencerCreateSchema.parse(body);

    // Check if handle already exists
    if (validated.tiktokHandle) {
      const existing = await prisma.influencer.findFirst({
        where: { tiktokHandle: validated.tiktokHandle },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'TikTok handle já existe' },
          { status: 409 }
        );
      }
    }

    // Get user from session or fallback to first user in DB
    const session = await getServerSession(authOptions);
    let createdById = session?.user?.id;
    
    if (!createdById) {
      // Fallback: use first user in database
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json(
          { error: 'Nenhum user encontrado. Execute o seed script.' },
          { status: 500 }
        );
      }
      createdById = firstUser.id;
    }

    // Create influencer
    const influencer = await prisma.influencer.create({
      data: {
        ...validated,
        createdById,
      },
    });

    logger.info('Influencer created', { id: influencer.id, name: influencer.name });

    // Auto-trigger import if has handle and status is IMPORT_PENDING
    if (validated.status === 'IMPORT_PENDING' && (validated.tiktokHandle || validated.instagramHandle)) {
      logger.info('Triggering auto-import for influencer', { id: influencer.id });
      // Queue for processing (worker will pick it up)
    }

    return NextResponse.json(serializeBigInt(influencer), { status: 201 });
  } catch (error) {
    logger.error('POST /api/influencers failed', error);
    return handleApiError(error);
  }
}
