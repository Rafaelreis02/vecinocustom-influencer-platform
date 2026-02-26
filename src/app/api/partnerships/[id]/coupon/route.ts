import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/partnerships/[id]/coupon - Save coupon code to workflow
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
    const body = await req.json();
    const { couponCode } = body;

    if (!couponCode) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Find the workflow
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { id },
    });

    const workflow = workflows[0];

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update workflow with coupon code
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        couponCode: couponCode.toUpperCase(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon code saved',
      data: updatedWorkflow,
    });
  } catch (error: any) {
    console.error('Error saving coupon code:', error);
    return NextResponse.json(
      { error: 'Failed to save coupon code: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/partnerships/[id]/coupon - Clear coupon code from workflow
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the workflow
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: { id },
    });

    const workflow = workflows[0];

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Clear coupon code from workflow
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        couponCode: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon code cleared',
      data: updatedWorkflow,
    });
  } catch (error: any) {
    console.error('Error clearing coupon code:', error);
    return NextResponse.json(
      { error: 'Failed to clear coupon code: ' + error.message },
      { status: 500 }
    );
  }
}
