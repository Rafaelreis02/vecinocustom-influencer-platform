/**
 * POST /api/emails/auto-link
 * 
 * Associates an influencer to an email AND to all other emails
 * from the same sender email address
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serializeBigInt } from '@/lib/serialize';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailId, influencerId } = body;

    if (!emailId || !influencerId) {
      return NextResponse.json(
        { error: 'Missing emailId or influencerId' },
        { status: 400 }
      );
    }

    // Get the email to find the sender
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Extract sender email (from "Name <email@example.com>" format)
    const senderMatch = email.from.match(/<([^>]+)>/);
    const senderEmail = senderMatch ? senderMatch[1] : email.from;

    // Find ALL emails from this sender that don't have this influencer
    const emailsToUpdate = await prisma.email.findMany({
      where: {
        from: {
          contains: senderEmail,
        },
        OR: [
          { influencerId: null },
          { influencerId: { not: influencerId } },
        ],
      },
      select: { id: true },
    });

    // Associar todos os emails deste remetente ao influencer
    const updatePromises = emailsToUpdate.map((e) =>
      prisma.email.update({
        where: { id: e.id },
        data: { influencerId },
      })
    );
    await Promise.all(updatePromises);

    // Actualizar o email do influencer com o email do remetente
    await prisma.influencer.update({
      where: { id: influencerId },
      data: { email: senderEmail },
    });

    logger.info(`[AUTO-LINK] ${emailsToUpdate.length} emails → influencer ${influencerId}, email → ${senderEmail}`);

    return NextResponse.json(
      serializeBigInt({
        success: true,
        associated: emailsToUpdate.length,
        senderEmail,
      })
    );
  } catch (error: any) {
    logger.error('[AUTO-LINK] Failed:', error);
    return NextResponse.json(
      { error: 'Auto-link failed: ' + error.message },
      { status: 500 }
    );
  }
}
