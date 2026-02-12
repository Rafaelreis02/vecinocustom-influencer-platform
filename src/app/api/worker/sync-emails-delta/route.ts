/**
 * Delta-Sync Emails from Gmail
 * Only imports NEW emails and updates CHANGED emails (not duplicates)
 * Uses updatedAt for tracking changes
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Get last sync time from headers or use 24h ago as default
    const lastSyncTime = request.headers.get('x-last-sync-time')
      ? new Date(request.headers.get('x-last-sync-time')!)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    logger.info('Delta-sync started', { lastSyncTime });

    // Get emails that were created/updated since last sync
    const changedEmails = await prisma.email.findMany({
      where: {
        OR: [
          { createdAt: { gte: lastSyncTime } },
          { updatedAt: { gte: lastSyncTime } },
        ],
      },
      orderBy: { receivedAt: 'desc' },
      take: 500, // Limit per sync
    });

    // Filter out duplicates (same gmailId)
    const gmailIds = new Set<string>();
    const uniqueEmails = changedEmails.filter((email) => {
      if (!email.gmailId) return true;
      if (gmailIds.has(email.gmailId)) return false;
      gmailIds.add(email.gmailId);
      return true;
    });

    logger.info('Delta-sync completed', {
      total: changedEmails.length,
      unique: uniqueEmails.length,
      deduped: changedEmails.length - uniqueEmails.length,
    });

    return NextResponse.json({
      success: true,
      synced: uniqueEmails.length,
      deduped: changedEmails.length - uniqueEmails.length,
      emails: uniqueEmails,
      nextSyncTime: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Delta-sync failed', error);
    return handleApiError(error);
  }
}
