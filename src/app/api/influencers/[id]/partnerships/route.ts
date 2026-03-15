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
      select: {
        id: true,
        currentStep: true,
        status: true,
        agreedPrice: true,
        createdAt: true,
        step9CompletedAt: true,
        isRestarted: true,
        // Step 1: Partnership
        contactEmail: true,
        contactInstagram: true,
        contactWhatsapp: true,
        step1CompletedAt: true,
        // Step 2: Shipping
        shippingAddress: true,
        productSuggestion1: true,
        productSuggestion2: true,
        productSuggestion3: true,
        step2CompletedAt: true,
        // Step 3: Preparing
        selectedProductUrl: true,
        step3CompletedAt: true,
        // Step 3.5: Design Reference
        designReferenceUrl: true,
        designReferenceSubmittedAt: true,
        // Step 4: Design Review
        designApproved: true,
        designRevisionCount: true,
        step4CompletedAt: true,
        // Step 5: Contract
        contractSigned: true,
        contractUrl: true,
        step5CompletedAt: true,
        // Step 6: Preparing Shipment
        trackingUrl: true,
        couponCode: true,
        step6CompletedAt: true,
        // Step 7 & 8
        step7CompletedAt: true,
        step8CompletedAt: true,
        // Relations
        emails: {
          select: {
            id: true,
            step: true,
            subject: true,
            sentAt: true,
          },
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get active partnership or most recent one (even if completed)
    const activePartnership = partnerships.find(p => p.status === 'ACTIVE') || 
                               partnerships[0]; // Fallback to most recent if no active

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
