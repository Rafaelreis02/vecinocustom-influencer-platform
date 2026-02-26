import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateContractPDF } from '@/lib/contract-pdf';
import { logger } from '@/lib/logger';

// POST /api/portal/[token]/accept-contract - Accept contract and generate PDF
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { ipAddress, userAgent } = body;

    // Find influencer by portal token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        name: true,
        tiktokHandle: true,
        instagramHandle: true,
        agreedPrice: true,
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { error: 'Invalid portal link' },
        { status: 404 }
      );
    }

    // Find active workflow
    const workflows = await prisma.partnershipWorkflow.findMany({
      where: {
        influencerId: influencer.id,
        status: 'ACTIVE',
      },
    });

    const workflow = workflows[0];

    if (!workflow) {
      return NextResponse.json(
        { error: 'No active partnership found' },
        { status: 404 }
      );
    }

    // Generate contract PDF
    const date = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const handle = influencer.tiktokHandle || influencer.instagramHandle || 'influencer';

    const pdfBytes = await generateContractPDF({
      influencerName: influencer.name,
      influencerHandle: handle.replace('@', ''),
      agreedPrice: influencer.agreedPrice || workflow.agreedPrice || 0,
      commissionRate: 20,
      date,
      ipAddress,
      userAgent,
    });

    // Save as file using data URL (base64)
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

    const file = await prisma.file.create({
      data: {
        filename: `contract-${influencer.id}-${Date.now()}.pdf`,
        originalName: `Collaboration Agreement - ${influencer.name} - ${date}.pdf`,
        mimeType: 'application/pdf',
        size: pdfBytes.length,
        url: dataUrl,
        type: 'CONTRACT',
        influencerId: influencer.id,
      },
    });

    // Update workflow to advance step
    await prisma.partnershipWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: 5,
        step4CompletedAt: new Date(),
        contractSigned: true,
      },
    });

    // Update influencer status
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { status: 'SHIPPED' },
    });

    logger.info('Contract accepted and PDF generated', {
      influencerId: influencer.id,
      fileId: file.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Contract accepted successfully',
      data: {
        fileId: file.id,
        signedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error accepting contract:', error);
    return NextResponse.json(
      { error: 'Failed to accept contract: ' + error.message },
      { status: 500 }
    );
  }
}
