import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/influencers - Listar todos os influencers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // working, negotiating, suggestion
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { instagramHandle: { contains: search, mode: 'insensitive' } },
        { tiktokHandle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const influencers = await prisma.influencer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        videos: {
          select: {
            views: true,
            likes: true,
            comments: true,
            shares: true,
          },
        },
        campaigns: {
          include: {
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
    });

    // Calcular estatísticas agregadas
    const influencersWithStats = influencers.map((inf) => {
      const totalViews = inf.videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalLikes = inf.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
      const totalComments = inf.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
      const totalShares = inf.videos.reduce((sum, v) => sum + (v.shares || 0), 0);
      const totalRevenue = inf.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);
      
      const totalFollowers = (inf.instagramFollowers || 0) + (inf.tiktokFollowers || 0);
      const engagementRate = totalFollowers > 0 
        ? ((totalLikes + totalComments + totalShares) / totalFollowers) * 100
        : 0;

      return {
        ...inf,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalRevenue,
        engagement: parseFloat(engagementRate.toFixed(2)),
        campaigns: inf.campaigns.length,
        activeCoupons: inf.coupons.filter(c => c.usageCount > 0).length,
      };
    });

    return NextResponse.json(influencersWithStats);
  } catch (err: any) {
    console.log('[API ERROR] Fetching influencers:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to fetch influencers', details: err?.message },
      { status: 500 }
    );
  }
}

// POST /api/influencers - Criar novo influencer
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Processar tags (string separada por vírgulas -> array)
    let tags = [];
    if (body.tags) {
      if (typeof body.tags === 'string') {
        tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(body.tags)) {
        tags = body.tags;
      }
    }

    // Get or create default user (AI Agent)
    let defaultUser = await prisma.user.findUnique({
      where: { email: 'ai@vecinocustom.com' }
    });

    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'ai@vecinocustom.com',
          name: 'AI Agent 🤖',
          role: 'ADMIN'
        }
      });
    }

    const influencer = await prisma.influencer.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.location || null,  // Map location -> address
        instagramHandle: body.instagramHandle || null,
        instagramFollowers: body.instagramFollowers ? parseInt(body.instagramFollowers) : null,
        tiktokHandle: body.tiktokHandle || null,
        tiktokFollowers: body.tiktokFollowers ? parseInt(body.tiktokFollowers) : null,
        status: body.status || 'suggestion',
        tier: body.tier || 'micro',
        notes: body.notes || null,
        tags,
        createdById: defaultUser.id,
      },
    });

    return NextResponse.json(influencer, { status: 201 });
  } catch (err: any) {
    console.log('[API ERROR] Creating influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to create influencer', details: err?.message },
      { status: 500 }
    );
  }
}
