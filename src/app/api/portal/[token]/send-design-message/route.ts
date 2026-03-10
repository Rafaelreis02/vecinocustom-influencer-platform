import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { InfluencerStatus } from '@prisma/client';

// POST /api/portal/[token]/send-design-message - Influencer sends design message/reference
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { content, imageUrl } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'Content or imageUrl required' }, { status: 400 });
    }

    // Get influencer by token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Get active workflow
    const workflow = await prisma.partnershipWorkflow.findFirst({
      where: { 
        influencerId: influencer.id,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'No active workflow found' }, { status: 404 });
    }

    // Create message using raw query
    const messageId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "DesignMessage" ("id", "workflowId", "content", "imageUrl", "senderType", "createdAt", "updatedAt")
      VALUES (${messageId}, ${workflow.id}, ${content || ''}, ${imageUrl || null}, 'INFLUENCER', NOW(), NOW())
    `;

    // If first message from influencer, update status
    const influencerMessages = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "DesignMessage" 
      WHERE "workflowId" = ${workflow.id} AND "senderType" = 'INFLUENCER'
    ` as any[];
    
    if (Number(influencerMessages[0]?.count) === 1) {
      // First message - update status
      await prisma.influencer.update({
        where: { id: influencer.id },
        data: { status: InfluencerStatus.DESIGN_REFERENCE_SUBMITTED },
      });
      
      // Update workflow
      await prisma.partnershipWorkflow.update({
        where: { id: workflow.id },
        data: {
          designReferenceUrl: imageUrl,
          designReferenceSubmittedAt: new Date(),
        },
      });
    }

    logger.info('[PORTAL] Design message sent:', { workflowId: workflow.id, messageId });

    return NextResponse.json({ success: true, messageId });
  } catch (error: any) {
    logger.error('[PORTAL] Error sending design message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
