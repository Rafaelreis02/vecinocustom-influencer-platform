import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/portal/[token]/workflow - Get workflow for portal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        instagramHandle: true,
        tiktokHandle: true,
        phone: true,
        avatarUrl: true,
        status: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find active workflow for this influencer (using raw query to avoid enum issues)
    const workflows = await prisma.$queryRaw`
      SELECT * FROM "partnership_workflows" 
      WHERE "influencerId" = ${influencer.id} 
      AND status = 'ACTIVE'
      LIMIT 1
    `;
    const workflow = Array.isArray(workflows) && workflows.length > 0 ? workflows[0] : null;

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found. Please contact VecinoCustom to start a partnership.' },
        { status: 404 }
      );
    }

    // Combine influencer profile data with workflow data
    const response = {
      // Profile data (common fields)
      id: influencer.id,
      name: influencer.name,
      email: workflow.contactEmail || influencer.email || '',
      instagramHandle: workflow.contactInstagram || influencer.instagramHandle || '',
      tiktokHandle: influencer.tiktokHandle || '',
      phone: workflow.contactWhatsapp || influencer.phone || '',
      ddiCode: '+351',
      avatarUrl: influencer.avatarUrl,

      // Workflow data (partnership-specific)
      agreedPrice: workflow.agreedPrice,
      status: influencer.status,
      currentStep: workflow.currentStep,
      shippingAddress: workflow.shippingAddress,
      productSuggestion1: workflow.productSuggestion1,
      productSuggestion2: workflow.productSuggestion2,
      productSuggestion3: workflow.productSuggestion3,
      chosenProduct: workflow.selectedProductUrl,
      trackingUrl: workflow.trackingUrl,
      couponCode: workflow.couponCode,
    };

    // Serialize to handle any BigInt values
    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('GET /api/portal/[token]/workflow failed', error);
    return NextResponse.json(
      { error: 'Failed to load partnership data' },
      { status: 500 }
    );
  }
}

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

    // Find workflows and filter for active one (avoid enum comparison issues)
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: {
        influencerId: influencer.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workflow = workflows.find(w => w.status === 'ACTIVE' || (w.status as any) === 'ACTIVE');

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found' },
        { status: 404 }
      );
    }

    // Fields that can be updated by influencer based on current step
    // workflowFields = stored in partnership_workflows table
    // profileFields = stored in influencers table
    const workflowFields: Record<number, string[]> = {
      1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'],
      2: ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'],
      3: [],
      4: [],
      5: [],
    };

    // Profile fields stored in influencers table
    const profileFields = ['name', 'tiktokHandle', 'email', 'instagramHandle', 'phone'];

    const allowedWorkflowFields = workflowFields[workflow.currentStep] || [];
    const updateData: Record<string, any> = {};
    const profileUpdateData: Record<string, any> = {};

    // Update workflow fields
    for (const key of allowedWorkflowFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];

        // Also update profile if field is empty there
        if (key === 'contactEmail' && body[key]) profileUpdateData.email = body[key];
        if (key === 'contactInstagram' && body[key]) profileUpdateData.instagramHandle = body[key];
        if (key === 'contactWhatsapp' && body[key]) profileUpdateData.phone = body[key];
      }
    }

    // Update profile fields directly
    if (body.name !== undefined && body.name) profileUpdateData.name = body.name;
    if (body.tiktokHandle !== undefined && body.tiktokHandle) profileUpdateData.tiktokHandle = body.tiktokHandle;

    // Check if this is a counterproposal (agreedPrice changed)
    const isCounterproposal = body.agreedPrice !== undefined && 
                               workflow.agreedPrice !== body.agreedPrice;

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

    // If counterproposal, update influencer status to ANALYZING
    if (isCounterproposal) {
      await prisma.influencer.update({
        where: { id: influencer.id },
        data: { status: 'ANALYZING' },
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
