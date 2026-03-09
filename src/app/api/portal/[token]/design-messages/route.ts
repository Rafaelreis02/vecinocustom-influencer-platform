import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/portal/[token]/design-messages - List messages for influencer
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get influencer by token
    const influencer = await prisma.influencer.findUnique({
      where: { portalToken: token },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Get active workflow for this influencer
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

    // Use raw query to avoid table name mismatch
    const messages = await prisma.$queryRaw`
      SELECT * FROM "DesignMessage" 
      WHERE "workflowId" = ${workflow.id} 
      ORDER BY "createdAt" ASC
    `;

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('[PORTAL_DESIGN] Error listing messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
