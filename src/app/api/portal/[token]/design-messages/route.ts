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
      include: { workflow: true },
    });

    if (!influencer || !influencer.workflow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await prisma.designMessage.findMany({
      where: { workflowId: influencer.workflow.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('[PORTAL_DESIGN] Error listing messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
