import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendWorkflowEmail } from '@/lib/partnership-email';

// Steps that influencer can advance
const INFLUENCER_ADVANCE_STEPS = [1, 2, 4];

// Required fields for each step (from influencer perspective)
const STEP_REQUIREMENTS: Record<number, string[]> = {
  1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'],
  2: ['shippingAddress', 'productSuggestion1'],
  4: ['contractSigned'], // Influencer confirms contract is signed
};

// POST /api/portal/[token]/advance - Advance workflow step from portal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Parse body - may contain data to save before advancing
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine - just advance without saving data first
    }

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: { id: true, name: true, email: true },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find active workflow using raw query to get fresh data and avoid enum issues
    const workflows = await prisma.$queryRaw`
      SELECT * FROM "partnership_workflows" 
      WHERE "influencerId" = ${influencer.id} 
      AND status = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 1
    ` as any[];

    const workflow = workflows.length > 0 ? workflows[0] : null;

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found' },
        { status: 404 }
      );
    }

    const currentStep = workflow.currentStep;

    // Check if influencer can advance this step
    if (!INFLUENCER_ADVANCE_STEPS.includes(currentStep)) {
      return NextResponse.json(
        { error: 'This step can only be advanced by VecinoCustom team' },
        { status: 403 }
      );
    }

    // If body contains data, save it to the workflow first (atomic operation)
    const dataFields: Record<number, string[]> = {
      1: ['contactEmail', 'contactInstagram', 'contactWhatsapp'],
      2: ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'],
      4: ['contractSigned'],
    };

    const allowedFields = dataFields[currentStep] || [];
    const saveData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        saveData[field] = body[field];
      }
    }

    if (Object.keys(saveData).length > 0) {
      await prisma.partnershipWorkflow.update({
        where: { id: workflow.id },
        data: saveData,
      });
    }

    // Also update profile fields if provided
    const profileData: Record<string, any> = {};
    if (body.name && body.name !== '') profileData.name = body.name;
    if (Object.keys(profileData).length > 0) {
      await prisma.influencer.update({
        where: { id: influencer.id },
        data: profileData,
      });
    }

    // Re-read the workflow to get fresh data after the save
    const freshWorkflows = await prisma.$queryRaw`
      SELECT * FROM "partnership_workflows" 
      WHERE id = ${workflow.id}
      LIMIT 1
    ` as any[];

    const freshWorkflow = freshWorkflows.length > 0 ? freshWorkflows[0] : workflow;

    // Check required fields using FRESH data
    const requiredFields = STEP_REQUIREMENTS[currentStep];
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      const value = freshWorkflow[field];
      if (field === 'contractSigned') {
        // Special check for contractSigned boolean
        if (value !== true) {
          missing.push(field);
        }
      } else if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', missing },
        { status: 400 }
      );
    }

    // Determine next step and status
    const nextSteps: Record<number, { step: number; status: string }> = {
      1: { step: 2, status: 'AGREED' },
      2: { step: 3, status: 'PRODUCT_SELECTION' },
      4: { step: 5, status: 'SHIPPED' },
    };

    const next = nextSteps[currentStep];
    if (!next) {
      return NextResponse.json(
        { error: 'Cannot advance from this step' },
        { status: 400 }
      );
    }

    // Send email notification before advancing
    const variables = {
      nome: influencer.name,
      valor: freshWorkflow.agreedPrice?.toString() || '0',
      email: freshWorkflow.contactEmail || influencer.email || undefined,
      instagram: freshWorkflow.contactInstagram || undefined,
      whatsapp: freshWorkflow.contactWhatsapp || undefined,
      morada: freshWorkflow.shippingAddress || undefined,
      sugestao1: freshWorkflow.productSuggestion1 || undefined,
      sugestao2: freshWorkflow.productSuggestion2 || undefined,
      sugestao3: freshWorkflow.productSuggestion3 || undefined,
      portalToken: token,
    };

    // Try to send email but don't block advancement if it fails
    try {
      await sendWorkflowEmail(
        workflow.id,
        currentStep,
        variables,
        'system'
      );
    } catch (emailError) {
      logger.error('Failed to send workflow email during advance, continuing anyway', emailError);
    }

    // Update workflow - advance step
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: next.step,
        [`step${currentStep}CompletedAt`]: new Date(),
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: next.status as any },
    });

    return NextResponse.json({
      success: true,
      message: `Advanced to step ${next.step}`,
      data: {
        currentStep: next.step,
        status: next.status,
      },
    });
  } catch (error) {
    logger.error('POST /api/portal/[token]/advance failed', error);
    return NextResponse.json(
      { error: 'Failed to advance step' },
      { status: 500 }
    );
  }
}
