import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getAuthClient, sendEmail } from '@/lib/gmail';
import { InfluencerStatus } from '@prisma/client';

/**
 * POST /api/influencers/[id]/contact
 * Send initial contact email to influencer and track it
 * Body: { subject?: string, body?: string } - optional custom email content
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    
    // Parse body if present, otherwise use empty object
    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      body = {};
    }
    const { subject: customSubject, body: customBody } = body as any;

    // Fetch influencer
    const influencer = await prisma.influencer.findUnique({
      where: { id },
    });

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Check if influencer has email
    if (!influencer.email) {
      return NextResponse.json(
        { error: 'Influencer has no email address' },
        { status: 400 }
      );
    }

    // Get or create email template for initial contact
    let template = await prisma.emailTemplate.findUnique({
      where: { key: 'INITIAL_CONTACT' },
    });

    // If no template exists, create default
    if (!template) {
      template = await prisma.emailTemplate.create({
        data: {
          key: 'INITIAL_CONTACT',
          name: 'Contacto Inicial - Prospecção',
          subject: customSubject || 'Colaboração VecinoCustom - Interessado?',
          body: customBody || `Olá {{nome}},

Somos a VecinoCustom, uma marca de joias personalizadas feitas à mão em Portugal.

Gostamos muito do teu conteúdo no Instagram e queríamos saber se terias interesse numa colaboração connosco.

Se sim, responde a este email ou pelo WhatsApp que falamos em mais detalhes.

Cumprimentos,
Equipa VecinoCustom

---
www.vecinocustom.com`,
          step: 0,
          isActive: true,
          hasValue: true,
        },
      });
    }

    // Replace variables in template
    const emailSubject = (customSubject || template.subject)
      .replace(/{{nome}}/g, influencer.name);

    const emailBody = (customBody || template.body)
      .replace(/{{nome}}/g, influencer.name)
      .replace(/{{email}}/g, influencer.email || '')
      .replace(/{{instagram}}/g, influencer.instagramHandle || '');

    // Send email via Gmail
    const auth = getAuthClient();
    const targetEmail = influencer.email;

    await sendEmail(auth, {
      to: targetEmail,
      subject: emailSubject,
      body: emailBody,
    });

    // Create contact record
    const contact = await prisma.influencerContact.create({
      data: {
        influencerId: id,
        emailSubject,
        emailBody,
        status: 'PENDING',
      },
    });

    // Update influencer status to CONTACTED
    await prisma.influencer.update({
      where: { id },
      data: { status: InfluencerStatus.CONTACTED },
    });

    logger.info(`Initial contact email sent to ${influencer.name} (${targetEmail})`);

    return NextResponse.json({
      success: true,
      message: 'Email de contacto enviado com sucesso',
      data: {
        contactId: contact.id,
        sentAt: contact.sentAt,
        email: targetEmail,
      },
    });
  } catch (error: any) {
    logger.error('Error sending contact email:', error);
    return NextResponse.json(
      { error: 'Failed to send contact email: ' + error.message },
      { status: 500 }
    );
  }
}
