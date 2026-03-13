/**
 * Email Sync Worker - UPDATED with inline Gmail client
 * 
 * POST /api/worker/sync-emails
 * 
 * Syncs emails from Gmail to the database using OAuth2
 * Called by cron job every hour or manual sync
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    logger.info('[SYNC] Starting email sync...');

    // Check if Gmail OAuth is configured
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: 'Gmail not configured',
          message: 'Missing GOOGLE_REFRESH_TOKEN. Need to authorize Gmail first.',
        },
        { status: 400 }
      );
    }

    // Create Gmail client inline (fix for googleapis v171.x bug)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch recent messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      labelIds: ['INBOX'],
    });

    const messages = response.data.messages || [];
    let syncedCount = 0;

    for (const message of messages) {
      if (!message.id) continue;

      try {
        // Check if email already exists
        const existing = await prisma.email.findUnique({
          where: { gmailId: message.id },
        });

        if (existing) continue;

        // Fetch full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const headers = fullMessage.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(no subject)';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value;

        // Extract body
        let body = '';
        let htmlBody = '';
        
        const payload = fullMessage.data.payload;
        if (payload) {
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
              if (part.mimeType === 'text/html' && part.body?.data) {
                htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
            }
          } else if (payload.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          }
        }

        // Create email in database
        await prisma.email.create({
          data: {
            gmailId: message.id,
            from: from,
            to: to,
            subject: subject,
            body: body,
            htmlBody: htmlBody,
            receivedAt: date ? new Date(date) : new Date(),
            isRead: !fullMessage.data.labelIds?.includes('UNREAD'),
            isFlagged: fullMessage.data.labelIds?.includes('STARRED') || false,
          },
        });

        syncedCount++;
      } catch (msgError) {
        logger.error(`[SYNC] Error processing message ${message.id}:`, msgError);
      }
    }

    logger.info(`[SYNC] Completed. Synced ${syncedCount} new emails`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[SYNC] Failed:', error);
    return NextResponse.json(
      { error: 'Sync failed: ' + error.message },
      { status: 500 }
    );
  }
}
