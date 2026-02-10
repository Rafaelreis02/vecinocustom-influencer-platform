import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Updated: 2026-02-07 - Added PATCH support for auto-import

// GET /api/influencers/[id] - Ver detalhes de um influencer
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
        },
        campaigns: {
          include: {
            campaign: true,
          },
        },
        coupons: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Calcular estatísticas
    const totalViews = influencer.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = influencer.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = influencer.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
    const totalShares = influencer.videos.reduce((sum, v) => sum + (v.shares || 0), 0);
    const totalRevenue = influencer.coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0);
    
    const totalFollowers = (influencer.instagramFollowers || 0) + (influencer.tiktokFollowers || 0);
    const engagementRate = totalFollowers > 0 
      ? ((totalLikes + totalComments + totalShares) / totalFollowers) * 100
      : 0;

    // Converter BigInt para string para JSON
    const result = JSON.parse(JSON.stringify({
      ...influencer,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalRevenue,
      avgEngagement: parseFloat(engagementRate.toFixed(2)),
      activeCoupons: influencer.coupons.filter(c => c.usageCount > 0).length,
    }, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(result);
  } catch (err: any) {
    console.log('[API ERROR] Fetching influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to fetch influencer', details: err?.message },
      { status: 500 }
    );
  }
}

// PUT /api/influencers/[id] - Editar influencer
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Processar tags (string separada por vírgulas -> array)
    let tags = body.tags;
    if (typeof body.tags === 'string') {
      tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    const influencer = await prisma.influencer.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.location || null,  // Map location -> address
        instagramHandle: body.instagramHandle || null,
        instagramFollowers: body.instagramFollowers ? parseInt(body.instagramFollowers) : null,
        tiktokHandle: body.tiktokHandle || null,
        tiktokFollowers: body.tiktokFollowers ? parseInt(body.tiktokFollowers) : null,
        status: body.status,
        tier: body.tier,
        notes: body.notes || null,
        tags: tags || [],
      },
    });

    return NextResponse.json(influencer);
  } catch (err: any) {
    console.log('[API ERROR] Updating influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to update influencer', details: err?.message },
      { status: 500 }
    );
  }
}

// PATCH /api/influencers/[id] - Atualizar parcialmente (para worker)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Processar tags e contentTypes
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    if (typeof body.contentTypes === 'string') {
      body.contentTypes = body.contentTypes.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Converter totalLikes para BigInt se necessário
    if (body.totalLikes !== undefined && typeof body.totalLikes === 'number') {
      body.totalLikes = BigInt(body.totalLikes);
    }

    const influencer = await prisma.influencer.update({
      where: { id },
      data: body, // Atualiza apenas campos enviados
    });

    // Converter BigInt para string para JSON
    const result = JSON.parse(JSON.stringify(influencer, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(result);
  } catch (err: any) {
    console.log('[API ERROR] Patching influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to update influencer', details: err?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/influencers/[id] - Apagar influencer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verificar se existe
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        campaigns: {
          include: {
            campaign: true,
          },
        },
        videos: true,
        coupons: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Verificar se tem campanhas ativas
    const activeCampaigns = influencer.campaigns.filter(
      (c) => c.campaign && c.campaign.status === 'ACTIVE'
    );

    if (activeCampaigns.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete influencer with active campaigns' },
        { status: 400 }
      );
    }

    // Apagar (Prisma vai apagar relacionamentos automaticamente com cascade)
    await prisma.influencer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log('[API ERROR] Deleting influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to delete influencer', details: err?.message },
      { status: 500 }
    );
  }
}
