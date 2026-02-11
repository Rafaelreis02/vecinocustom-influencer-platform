/**
 * POST /api/emails/[id]/auto-detect
 * 
 * Auto-detect influencer from email sender:
 * 1. If influencer with matching email exists → link to email
 * 2. If not → create new IMPORT_PENDING influencer
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: any) {
  try {
    // Get email
    const email = await prisma.email.findUnique({
      where: { id: params.id },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Try to find influencer by email
    let influencer = await prisma.influencer.findFirst({
      where: {
        email: email.from,
      },
    });

    // If not found, create new IMPORT_PENDING influencer
    if (!influencer) {
      console.log(`[AUTO-DETECT] New influencer from email: ${email.from}`);

      // Get or create default user
      let defaultUser = await prisma.user.findUnique({
        where: { email: 'ai@vecinocustom.com' },
      });

      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            email: 'ai@vecinocustom.com',
            name: 'AI Agent',
            role: 'ADMIN',
          },
        });
      }

      // Create new influencer (from email)
      const nameFromEmail = email.from.split('@')[0].replace(/[._]/g, ' ');

      influencer = await prisma.influencer.create({
        data: {
          name: nameFromEmail,
          email: email.from,
          status: 'IMPORT_PENDING',
          createdById: defaultUser.id,
          notes: `🔔 Contactou-nos por email: ${email.subject}`,
        },
      });

      console.log(
        `[AUTO-DETECT] Created influencer: ${influencer.name} (${influencer.id})`
      );
    }

    // Link email to influencer
    const updatedEmail = await prisma.email.update({
      where: { id: params.id },
      data: {
        influencerId: influencer.id,
      },
      include: {
        influencer: true,
      },
    });

    return NextResponse.json({
      success: true,
      email: updatedEmail,
      influencer: {
        id: influencer.id,
        name: influencer.name,
        status: influencer.status,
        isNew: !influencer.email || influencer.email === email.from,
      },
    });
  } catch (error: any) {
    console.error('[AUTO-DETECT ERROR]', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-detect influencer' },
      { status: 500 }
    );
  }
}
