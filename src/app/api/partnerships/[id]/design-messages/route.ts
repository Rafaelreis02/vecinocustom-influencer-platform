import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { google } from 'googleapis';

/**
 * Design Messages — Step 4
 *
 * Botão "Enviar Prova" → guarda mensagem + envia email ao influencer.
 * 1ª mensagem admin → template DESIGN_REVIEW_FIRST  ("o teu design está pronto")
 * 2ª+ mensagens admin → template DESIGN_REVIEW_REVISION ("fizemos as alterações")
 *
 * FIX: Cria cliente Gmail inline para evitar bug googleapis v171.x
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

    // === FIX: Criar cliente Gmail inline ===
    let emailSent = false;
    let emailError: string | null = null;

    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (workflow.influencer.email && refreshToken) {
      const templateKey = isFirstDesign ? 'DESIGN_REVIEW_FIRST' : 'DESIGN_REVIEW_REVISION';

      const template = await prisma.emailTemplate.findUnique({ where: { key: templateKey } });

      if (template) {
        try {
          // Criar cliente Gmail inline
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`
          );

          oauth2Client.setCredentials({
            refresh_token: refreshToken,
          });

          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

          const senderEmail = process.env.GMAIL_USER || 'brand@vecinocustom.com';
          const senderName = 'VecinoCustom';
          const portalUrl = `https://vecinocustom-influencer-platform.vercel.app/portal/${workflow.influencer.portalToken}`;

          const subject = template.subject;
          const emailBody = template.body
            .replace(/{{nome}}/g, workflow.influencer.name || '')
            .replace(/{{portalToken}}/g, workflow.influencer.portalToken || '')
            .replace(/{{portalUrl}}/g, portalUrl)
            .replace(/{{mensagem}}/g, content || '');

          // Build email message
          const emailMessage = [
            `From: ${senderName} <${senderEmail}>`,
            `To: ${workflow.influencer.email}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'MIME-Version: 1.0',
            '',
            emailBody,
          ].join('\n');

          const encodedMessage = Buffer.from(emailMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

          // Send email
          const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: encodedMessage,
            },
          });

          emailSent = true;

          // Registar email na DB para histórico
          await prisma.partnershipEmail.create({
            data: {
              workflowId: id,
              step: 4,
              templateKey,
              subject,
              body: emailBody,
              sentBy: session.user.id || 'system',
              variables: { nome: workflow.influencer.name, portalToken: workflow.influencer.portalToken, mensagem: content } as any,
            },
          });

          logger.info('[DESIGN_MESSAGES] Email sent', {
            workflowId: id,
            template: templateKey,
            isFirstDesign,
            to: workflow.influencer.email,
            messageId: result.data.id,
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
      emailError = !workflow.influencer.email ? 'Influencer has no email' : 'Gmail not configured';
      logger.warn('[DESIGN_MESSAGES] Cannot send email', { 
        workflowId: id, 
        hasEmail: !!workflow.influencer.email,
        hasRefreshToken: !!refreshToken,
      });
    }
    // =======================================

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
