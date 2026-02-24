import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/lib/serialize';
import { InfluencerCreateSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { downloadAndStoreImage } from '@/lib/image-storage';
import { linkVideosToInfluencer } from '@/lib/video-linker';

// GET /api/influencers - Listar influencers com pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validated = InfluencerCreateSchema.parse(body);
    
    // Download and store avatar if provided (external URL)
    let avatarUrl = validated.avatarUrl;
    if (avatarUrl && (avatarUrl.includes('tiktokcdn.com') || avatarUrl.includes('instagram.com'))) {
      logger.info(`[INFLUENCER] Downloading avatar from: ${avatarUrl}`);
      try {
        const storedUrl = await downloadAndStoreImage(
          avatarUrl,
          `avatars/${Date.now()}-${validated.tiktokHandle || validated.instagramHandle || 'influencer'}.jpg`
        );
        if (storedUrl) {
          avatarUrl = storedUrl;
          logger.info(`[INFLUENCER] Avatar downloaded successfully`);
        }
      } catch (avatarError) {
        logger.warn('[INFLUENCER] Avatar download failed, using original URL', avatarError);
      }
    }

    // Create influencer
    const influencer = await prisma.influencer.create({
      data: {
        ...validated,
        avatarUrl,
        createdById: session.user.id,
      },
    });

    logger.info('Influencer created', { id: influencer.id, name: influencer.name });

    // Link videos if TikTok handle provided
    if (validated.tiktokHandle) {
      try {
        await linkVideosToInfluencer(influencer.id, validated.tiktokHandle.replace('@', ''), 'TIKTOK');
        logger.info('Videos linked', { id: influencer.id });
      } catch (videoError) {
        logger.warn('Video linking failed', videoError);
      }
    }

    return NextResponse.json(serializeBigInt(influencer), { status: 201 });
  } catch (error) {
    logger.error('POST /api/influencers failed', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return handleApiError(error);
  }
}
