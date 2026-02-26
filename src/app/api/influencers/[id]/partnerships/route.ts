import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/influencers/[id]/partnerships - Get all partnerships for an influencer
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    const partnerships = await prisma.partnershipWorkflow.findMany({
      where: { influencerId: id },
      include: {
        emails: {
          select: {
            id: true,
            step: true,
            subject: true,
            sentAt: true,
          },
          orderBy: { sentAt: 'desc' },
        },
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get active partnership separately
    const activePartnership = partnerships.find(p => p.status === 'ACTIVE');

    return NextResponse.json({
      success: true,
      data: {
        influencer,
        activePartnership,
        history: partnerships,
        totalCount: partnerships.length,
      },
    });
  } catch (error) {
    console.error('Error fetching partnerships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partnerships' },
      { status: 500 }
    );
  }
}
