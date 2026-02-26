import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/partnerships/create - Create new workflow for an influencer
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { influencerId } = body;

    if (!influencerId) {
      return NextResponse.json(
        { error: 'influencerId is required' },
        { status: 400 }
      );
    }

    // Check if influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Create new workflow starting at step 1
    // Allow multiple workflows - don't check for existing active ones
    const workflow = await prisma.partnershipWorkflow.create({
      data: {
        influencerId,
        currentStep: 1,
        status: 'ACTIVE',
        // Pre-fill contact data from influencer if available
        contactEmail: influencer.email || null,
        contactInstagram: influencer.instagramHandle || null,
      },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update influencer status to COUNTER_PROPOSAL (waiting for influencer response)
    await prisma.influencer.update({
      where: { id: influencerId },
      data: { status: 'COUNTER_PROPOSAL' },
    });

    return NextResponse.json(
      { success: true, data: workflow },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow: ' + error.message },
      { status: 500 }
    );
  }
}
