import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/partnerships/[id]/cancel - Cancel partnership
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Partnership is already cancelled' },
        { status: 400 }
      );
    }

    // Cancel the workflow
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
          },
        },
      },
    });

    // Update influencer status to CANCELLED
    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Partnership cancelled successfully',
      data: updatedWorkflow,
    });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}
