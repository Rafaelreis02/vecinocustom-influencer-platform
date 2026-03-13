/**
 * POST /api/emails/auto-detect-all
 * 
 * Automatically detects and links influencers to all unassociated emails
 * based on matching email addresses
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    logger.info('[AUTO-DETECT] Starting auto-detection for all emails...');

    // Get all influencers with their emails
    const influencers = await prisma.influencer.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true },
    });

    let totalLinked = 0;

    // For each influencer, find matching emails
    for (const influencer of influencers) {
      if (!influencer.email) continue;

      const matchingEmails = await prisma.email.findMany({
        where: {
          from: {
            contains: influencer.email,
            mode: 'insensitive',
          },
          influencerId: null, // Only unassociated
        },
        select: { id: true },
      });

      if (matchingEmails.length > 0) {
        // Link all matching emails to this influencer
        await prisma.email.updateMany({
          where: {
            id: { in: matchingEmails.map(e => e.id) },
          },
          data: { influencerId: influencer.id },
        });

        totalLinked += matchingEmails.length;
        logger.info(`[AUTO-DETECT] Linked ${matchingEmails.length} emails to influencer ${influencer.email}`);
      }
    }

    logger.info(`[AUTO-DETECT] Completed. Total linked: ${totalLinked}`);

    return NextResponse.json({
      success: true,
      linked: totalLinked,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[AUTO-DETECT] Failed:', error);
    return NextResponse.json(
      { error: 'Auto-detect failed: ' + error.message },
      { status: 500 }
    );
  }
}
