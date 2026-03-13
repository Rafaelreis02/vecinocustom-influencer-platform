import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { google } from 'googleapis';
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(influencer.email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
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

    // Send email via Gmail - INLINE (same as /api/emails/compose)
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'Gmail não configurado',
          message: 'Por favor, conecta o Gmail nas Definições (Settings) primeiro',
          action: 'redirect_to_settings'
        },
        { status: 400 }
      );
    }

    // Setup Gmail client inline (fixes v171.x bug)
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
    const targetEmail = influencer.email.trim();
    
    // Build email message
    const email = [
      `From: ${senderName} <${senderEmail}>`,
      `To: ${targetEmail}`,
      `Subject: ${emailSubject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      emailBody,
    ].join('\n');

    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
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
