import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// PUT /api/portal/[token]/workflow - Update workflow from portal
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: { id: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find active workflow
    const workflow = await prisma.partnershipWorkflow.findFirst({
      where: {
        influencerId: influencer.id,
        status: 'ACTIVE',
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found' },
        { status: 404 }
      );
    }

    // Fields that can be updated by influencer based on current step
    const stepFields: Record<number, string[]> = {
      1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'], // Can fill contact info
      2: ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'],
      3: [], // Read-only for influencer
      4: [], // Read-only for influencer
      5: [], // Read-only for influencer
    };

    const allowedFields = stepFields[workflow.currentStep] || [];
    const updateData: Record<string, any> = {};
    const profileUpdateData: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
        
        // Also update profile if field is empty there
        if (key === 'contactEmail') profileUpdateData.email = body[key];
        if (key === 'contactInstagram') profileUpdateData.instagramHandle = body[key];
        if (key === 'contactWhatsapp') profileUpdateData.phone = body[key];
      }
    }

    // Update workflow
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: updateData,
    });

    // Update influencer profile if common fields are empty
    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.influencer.update({
        where: { id: influencer.id },
        data: profileUpdateData,
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedWorkflow,
    });
  } catch (error) {
    logger.error('PUT /api/portal/[token]/workflow failed', error);
    return NextResponse.json(
      { error: 'Failed to update partnership data' },
      { status: 500 }
    );
  }
}
