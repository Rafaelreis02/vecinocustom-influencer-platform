import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getAuthClient, sendEmail } from '@/lib/gmail';

// GET /api/partnerships/[id]/design-messages - List all messages for a workflow
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

    // Use raw query to avoid table name mismatch
    const messages = await prisma.$queryRaw`
      SELECT * FROM "DesignMessage" 
      WHERE "workflowId" = ${id} 
      ORDER BY "createdAt" ASC
    `;

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('[DESIGN_MESSAGES] Error listing messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/partnerships/[id]/design-messages - Send a new message
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
    const { content, imageUrl } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'Content or imageUrl required' }, { status: 400 });
    }

    // Verify workflow exists and is at step 4
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Design review only available at step 4' }, { status: 400 });
    }

    // Create message using raw query
    const messageId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "DesignMessage" ("id", "workflowId", "content", "imageUrl", "senderType", "createdAt", "updatedAt")
      VALUES (${messageId}, ${id}, ${content || ''}, ${imageUrl || null}, 'ADMIN', NOW(), NOW())
    `;

    // Fetch the created message
    const [message] = await prisma.$queryRaw`
      SELECT * FROM "DesignMessage" WHERE "id" = ${messageId}
    ` as any[];

    logger.info('[DESIGN_MESSAGES] Admin sent message:', { workflowId: id, messageId });

    // Check if this is the first message or a revision
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "DesignMessage" WHERE "workflowId" = ${id} AND "senderType" = 'ADMIN'
    ` as any[];
    const previousMessages = Number(countResult[0]?.count || 0);
    const isFirstDesign = previousMessages === 1;

    // Get email template based on whether it's first design or revision
    const templateKey = isFirstDesign ? 'DESIGN_REVIEW_FIRST' : 'DESIGN_REVIEW_REVISION';
    
    const template = await prisma.emailTemplate.findUnique({
      where: { key: templateKey },
    });

    // Send email notification to influencer
    try {
      const workflowWithInfluencer = await prisma.partnershipWorkflow.findUnique({
        where: { id },
        include: { influencer: true },
      });

      const influencer = workflowWithInfluencer?.influencer;
      if (influencer?.email) {
        const auth = getAuthClient();
        
        // Build email using template or fallback
        let emailSubject: string;
        let emailBody: string;
        
        if (template) {
          emailSubject = template.subject;
          emailBody = template.body
            .replace(/{{nome}}/g, influencer.name || '')
            .replace(/{{portalUrl}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom.com'}/portal/${influencer.portalToken}`)
            .replace(/{{mensagem}}/g, content || '');
        } else {
          // Fallback if template not found
          emailSubject = isFirstDesign 
            ? '🎨 O teu design está pronto!'
            : '🎨 Revisão do teu design - Verifica as alterações';
          emailBody = `Olá ${influencer.name || ''},

${isFirstDesign 
  ? 'Temos uma excelente notícia! O design da tua peça personalizada está pronto. 🎉'
  : 'Fizemos as alterações solicitadas ao teu design! 🎨'}

Podes ver ${isFirstDesign ? 'o mockup' : 'a nova versão'} e aprovar através do teu portal:
${process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom.com'}/portal/${influencer.portalToken}

${content ? `Mensagem da equipa:\n${content}\n\n` : ''}Cumprimentos,\nEquipa VecinoCustom`;
        }

        await sendEmail(auth, {
          to: influencer.email,
          subject: emailSubject,
          body: emailBody,
        });
        
        logger.info('[DESIGN_MESSAGES] Email notification sent to influencer:', { 
          email: influencer.email,
          template: templateKey,
          isFirstDesign 
        });
      }
    } catch (emailError) {
      logger.error('[DESIGN_MESSAGES] Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    logger.error('[DESIGN_MESSAGES] Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
