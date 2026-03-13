import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { google } from 'googleapis';

// POST /api/partnerships/[id]/accept-counter - Accept influencer counterproposal
// Ação: NÓS aceitamos a proposta do influencer → avança workflow + envia email notificação
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

    const workflow = await prisma.partnershipWorkflow.findUnique({
      where: { id },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            instagramHandle: true,
            portalToken: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Avançar para Step 2 e atualizar status
    const updatedWorkflow = await prisma.partnershipWorkflow.update({
      where: { id },
      data: {
        currentStep: 2,
        step1CompletedAt: new Date(),
      },
    });

    await prisma.influencer.update({
      where: { id: workflow.influencerId },
      data: { status: 'AGREED' as any },
    });

    // === ENVIAR EMAIL DE NOTIFICAÇÃO ===
    let emailSent = false;
    let emailError: string | null = null;

    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (workflow.influencer.email && refreshToken) {
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

        const subject = 'VecinoCustom - Proposta aceite! Preenche os dados de envio 🎉';
        const body = `Olá ${workflow.influencer.name},

Boa notícia! Aceitámos a tua proposta de parceria! 🎉

Para avançarmos, precisamos que preenchas os dados de envio no teu portal:
${portalUrl}

Precisamos de:
• A tua morada completa
• Sugestões de produtos que gostavas de receber

Assim que preencheres, avançamos para a preparação da tua peça personalizada!

Cumprimentos,
Equipa VecinoCustom

---
Para qualquer questão, responde a este email.
www.vecinocustom.com`;

        // Build email message
        const emailMessage = [
          `From: ${senderName} <${senderEmail}>`,
          `To: ${workflow.influencer.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          'MIME-Version: 1.0',
          '',
          body,
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
            step: 1, // Step 1 completion
            templateKey: 'COUNTER_ACCEPTED',
            subject,
            body,
            sentBy: session.user.id || 'system',
            variables: { 
              nome: workflow.influencer.name, 
              portalToken: workflow.influencer.portalToken,
              agreedPrice: workflow.agreedPrice?.toString(),
            } as any,
          },
        });

        logger.info('[ACCEPT_COUNTER] Email sent', {
          workflowId: id,
          to: workflow.influencer.email,
          messageId: result.data.id,
        });
      } catch (err: any) {
        emailError = err.message;
        logger.error('[ACCEPT_COUNTER] Email failed', { error: err.message });
      }
    } else {
      emailError = !workflow.influencer.email ? 'Influencer has no email' : 'Gmail not configured';
      logger.warn('[ACCEPT_COUNTER] Cannot send email', { 
        workflowId: id, 
        hasEmail: !!workflow.influencer.email,
        hasRefreshToken: !!refreshToken,
      });
    }
    // ====================================

    logger.info('[ACCEPT_COUNTER] Counterproposal accepted', {
      workflowId: id,
      influencerId: workflow.influencerId,
      emailSent,
      emailError,
    });

    return NextResponse.json({
      success: true,
      message: 'Counterproposal accepted',
      data: updatedWorkflow,
      emailSent,
      emailError,
    });
  } catch (error: any) {
    logger.error('[ACCEPT_COUNTER] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to accept counterproposal: ' + error.message },
      { status: 500 }
    );
  }
}
