import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/partnerships/[id] - Get workflow by ID
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

    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
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
        emails: {
          orderBy: { sentAt: 'desc' },
        },
        previousWorkflow: {
          select: {
            id: true,
            currentStep: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PATCH /api/partnerships/[id] - Update workflow fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Fields allowed to update per step
    const stepFields: Record<number, string[]> = {
      1: ['agreedPrice', 'contactEmail', 'contactInstagram', 'contactWhatsapp'],
      2: ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'],
      3: ['selectedProductUrl', 'designProofUrl', 'designNotes'],
      4: ['contractSigned', 'contractUrl'],
      5: ['trackingUrl', 'couponCode'],
    };

    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Only allow updating fields for current step
    const allowedFields = stepFields[workflow.currentStep] || [];
    const updateData: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Also allow updating status to CANCELLED from any step
    if (body.status === 'CANCELLED') {
      updateData.status = 'CANCELLED';
    }

    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: updatedWorkflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}
