import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/influencers/[id]/generate-link - Generate/regenerate portalToken
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      select: { portalToken: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // If token already exists, return it (don't regenerate unless forced)
    if (influencer.portalToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const portalUrl = `${baseUrl}/portal/${influencer.portalToken}`;
      
      return NextResponse.json({
        success: true,
        portalToken: influencer.portalToken,
        portalUrl,
      });
    }

    // Generate new token (Prisma will auto-generate UUID)
    const updated = await prisma.influencer.update({
      where: { id },
      data: {
        // Force update to trigger default value generation if needed
        updatedAt: new Date(),
      },
      select: { portalToken: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/portal/${updated.portalToken}`;

    return NextResponse.json({
      success: true,
      portalToken: updated.portalToken,
      portalUrl,
    });
  } catch (err: any) {
    console.error('[API ERROR] Generating portal link:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to generate portal link', details: err?.message },
      { status: 500 }
    );
  }
}
