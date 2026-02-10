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
      
      // Use stored engagementRate if available, otherwise calculate from videos
      const engagement = inf.engagementRate !== null && inf.engagementRate !== undefined
        ? inf.engagementRate 
        : (totalFollowers > 0 
            ? parseFloat((((totalLikes + totalComments + totalShares) / totalFollowers) * 100).toFixed(2))
            : 0);

      return {
        ...inf,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalRevenue,
        totalFollowers,
        engagement,
        matchScore: inf.fitScore || null, // Add fitScore as matchScore
        campaigns: inf.campaigns.length,
        activeCoupons: inf.coupons.filter(c => c.usageCount > 0).length,
      };
    });

    // Converter BigInt para string para JSON
    const result = JSON.parse(JSON.stringify(influencersWithStats, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(result);
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

    // Validação de campos obrigatórios (apenas para statuses do CLOSING phase)
    const requiresFullData = ['AGREED', 'PRODUCT_SELECTION', 'CONTRACT_PENDING', 'SHIPPED', 'COMPLETED'].includes(body.status);
    
    if (requiresFullData) {
      const missingFields = [];
      
      if (!body.name) missingFields.push('name');
      if (!body.tiktokHandle && !body.instagramHandle) missingFields.push('tiktokHandle or instagramHandle');
      if (!body.tiktokFollowers && !body.instagramFollowers) missingFields.push('followers');
      if (body.engagementRate === undefined || body.engagementRate === null) missingFields.push('engagementRate');
      if (!body.averageViews) missingFields.push('averageViews');
      if (!body.contentStability) missingFields.push('contentStability');
      if (!body.country) missingFields.push('country');
      if (!body.language) missingFields.push('language');
      if (!body.niche) missingFields.push('niche');
      if (!body.contentTypes || (Array.isArray(body.contentTypes) && body.contentTypes.length === 0)) missingFields.push('contentTypes');
      if (!body.primaryPlatform) missingFields.push('primaryPlatform');
      if (body.fitScore === undefined || body.fitScore === null) missingFields.push('fitScore');
      if (body.estimatedPrice === undefined || body.estimatedPrice === null) missingFields.push('estimatedPrice');
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: 'Campos obrigatórios em falta', missingFields },
          { status: 400 }
        );
      }
    }

    // Processar tags (string separada por vírgulas -> array)
    let tags = [];
    if (body.tags) {
      if (typeof body.tags === 'string') {
        tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(body.tags)) {
        tags = body.tags;
      }
    }

    // Processar contentTypes
    let contentTypes = [];
    if (body.contentTypes) {
      if (typeof body.contentTypes === 'string') {
        contentTypes = body.contentTypes.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(body.contentTypes)) {
        contentTypes = body.contentTypes;
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
        address: body.location || body.address || null,
        instagramHandle: body.instagramHandle || null,
        instagramFollowers: body.instagramFollowers ? parseInt(body.instagramFollowers) : null,
        tiktokHandle: body.tiktokHandle || null,
        tiktokFollowers: body.tiktokFollowers ? parseInt(body.tiktokFollowers) : null,
        youtubeHandle: body.youtubeHandle || null,
        youtubeFollowers: body.youtubeFollowers ? parseInt(body.youtubeFollowers) : null,
        
        // Metrics
        totalLikes: body.totalLikes ? BigInt(body.totalLikes) : null,
        engagementRate: body.engagementRate ? parseFloat(body.engagementRate) : null,
        averageViews: body.averageViews || null,
        contentStability: body.contentStability || null,
        
        // Demographics
        country: body.country || null,
        language: body.language || null,
        niche: body.niche || null,
        contentTypes,
        primaryPlatform: body.primaryPlatform || null,
        
        // Business
        estimatedPrice: body.estimatedPrice ? parseFloat(body.estimatedPrice) : null,
        fitScore: body.fitScore ? parseInt(body.fitScore) : null,
        
        // Discovery
        discoveryMethod: body.discoveryMethod || null,
        discoveryDate: body.discoveryDate ? new Date(body.discoveryDate) : null,
        
        // Status
        status: body.status || 'UNKNOWN',
        tier: body.tier || 'micro',
        notes: body.notes || null,
        tags,
        
        createdById: defaultUser.id,
      },
    });

    // If IMPORT_PENDING, trigger analysis immediately (async, don't block response)
    if (body.status === 'IMPORT_PENDING' && (body.tiktokHandle || body.instagramHandle)) {
      const handle = (body.tiktokHandle || body.instagramHandle).replace('@', '');
      const platform = body.tiktokHandle ? 'TIKTOK' : 'INSTAGRAM';
      
      // Fire and forget - don't wait for response
      fetch(`${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/api/worker/analyze-influencer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, platform }),
      }).catch(err => console.error('[AUTO-ANALYZE] Error:', err.message));
    }

    return NextResponse.json(influencer, { status: 201 });
  } catch (err: any) {
    console.log('[API ERROR] Creating influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to create influencer', details: err?.message },
      { status: 500 }
    );
  }
}
