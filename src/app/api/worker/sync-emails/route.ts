/**
 * Email Sync Worker
 * 
 * POST /api/worker/sync-emails
 * 
 * Syncs emails from Gmail to the database using OAuth2
 * Called by cron job every hour
 */

import { NextResponse } from 'next/server';
import { syncEmails, getAuthClient } from '@/lib/gmail';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    logger.info('Starting email sync...');

    // Check if Gmail OAuth is configured
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return NextResponse.json(
        {
          error: 'Gmail not configured',
          message: 'Missing GOOGLE_REFRESH_TOKEN in .env.local. Need to authorize Gmail first via /api/auth/gmail/authorize',
        },
        { status: 400 }
      );
    }

    // Get auth client with refresh token
    const auth = getAuthClient();

    // Sync emails using Gmail API
    const totalSynced = await syncEmails(auth);

    logger.info(`Synced ${totalSynced} emails`);

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('POST /api/worker/sync-emails failed', error);
    return handleApiError(error);
  }
}
