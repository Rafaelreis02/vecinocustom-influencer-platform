import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendWorkflowEmail } from '@/lib/partnership-email';

/**
 * Design Messages — Step 4
 *
 * Botão "Enviar Prova" → guarda mensagem + envia email ao influencer.
 * 1ª mensagem admin → template DESIGN_REVIEW_FIRST  ("o teu design está pronto")
 * 2ª+ mensagens admin → template DESIGN_REVIEW_REVISION ("fizemos as alterações")
 *
 * Usa sendWorkflowEmail para consistência com o resto do sistema.
 */

// GET /api/partnerships/[id]/design-messages - Listar mensagens
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

// POST /api/partnerships/[id]/design-messages - Enviar prova/mensagem ao influencer
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

    // Verificar workflow
    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            portalToken: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (workflow.currentStep !== 4) {
      return NextResponse.json({ error: 'Design review only available at step 4' }, { status: 400 });
    }

    // Guardar mensagem
    const messageId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "DesignMessage" ("id", "workflowId", "content", "imageUrl", "senderType", "createdAt", "updatedAt")
      VALUES (${messageId}, ${id}, ${content || ''}, ${imageUrl || null}, 'ADMIN', NOW(), NOW())
    `;

    const [message] = await prisma.$queryRaw`
      SELECT * FROM "DesignMessage" WHERE "id" = ${messageId}
    ` as any[];

    // Contar mensagens ADMIN anteriores para saber se é 1ª prova ou revisão
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "DesignMessage"
      WHERE "workflowId" = ${id} AND "senderType" = 'ADMIN'
    ` as any[];
    const adminMessageCount = Number(countResult[0]?.count || 0);
    const isFirstDesign = adminMessageCount === 1;

    // Enviar email via sendWorkflowEmail
    // Step 4 com isFirstDesign determina o template: DESIGN_REVIEW_FIRST ou DESIGN_REVIEW_REVISION
    // Passamos 'isFirstDesign' como variável extra para o partnership-email escolher o template certo
    let emailSent = false;
    let emailError: string | null = null;

    if (workflow.influencer.email) {
      // Usar step 4 para 1ª prova, step 40 (fictício) para revisão — 
      // na verdade passamos a chave direta para o template
      const templateKey = isFirstDesign ? 'DESIGN_REVIEW_FIRST' : 'DESIGN_REVIEW_REVISION';

      const template = await prisma.emailTemplate.findUnique({ where: { key: templateKey } });

      if (template) {
        // Render manual do template (o sendWorkflowEmail usa step number, não key direta)
        // Para design-messages usamos sendWorkflowEmail com step especial
        // Step 4 → partnership-email.ts retorna null (design é enviado aqui)
        // Então fazemos o render e envio direto mas com a mesma lib Gmail
        const { getAuthClient, sendEmail } = await import('@/lib/gmail');
        const portalUrl = `https://vecinocustom-influencer-platform.vercel.app/portal/${workflow.influencer.portalToken}`;

        const subject = template.subject;
        const body = template.body
          .replace(/{{nome}}/g, workflow.influencer.name || '')
          .replace(/{{portalToken}}/g, workflow.influencer.portalToken || '')
          .replace(/{{portalUrl}}/g, portalUrl)
          .replace(/{{mensagem}}/g, content || '');

        try {
          const auth = getAuthClient();
          await sendEmail(auth, { to: workflow.influencer.email, subject, body });
          emailSent = true;

          // Registar email na DB para histórico
          await prisma.partnershipEmail.create({
            data: {
              workflowId: id,
              step: 4,
              templateKey,
              subject,
              body,
              sentBy: session.user.id || 'system',
              variables: { nome: workflow.influencer.name, portalToken: workflow.influencer.portalToken, mensagem: content } as any,
            },
          });

          logger.info('[DESIGN_MESSAGES] Email sent', {
            workflowId: id,
            template: templateKey,
            isFirstDesign,
            to: workflow.influencer.email,
          });
        } catch (err: any) {
          emailError = err.message;
          logger.error('[DESIGN_MESSAGES] Email failed', { error: err.message });
        }
      } else {
        emailError = `Template ${templateKey} not found`;
        logger.warn('[DESIGN_MESSAGES] Template not found', { templateKey });
      }
    } else {
      emailError = 'Influencer has no email';
      logger.warn('[DESIGN_MESSAGES] No influencer email', { workflowId: id });
    }

    return NextResponse.json({
      success: true,
      data: message,
      emailSent,
      emailError,
    });
  } catch (error: any) {
    logger.error('[DESIGN_MESSAGES] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
