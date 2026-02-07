import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/influencers/[id]/update - Atualizar influencer (workaround para PATCH)
export async function POST(
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
      data: body,
    });

    // Converter BigInt para string para JSON
    const result = JSON.parse(JSON.stringify(influencer, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(result);
  } catch (err: any) {
    console.log('[API ERROR] Updating influencer:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to update influencer', details: err?.message },
      { status: 500 }
    );
  }
}
