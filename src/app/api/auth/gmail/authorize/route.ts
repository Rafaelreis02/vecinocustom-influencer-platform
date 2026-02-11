/**
 * Gmail OAuth2 Authorization URL Generator
 * 
 * GET /api/auth/gmail/authorize
 * 
 * Generates the Google authorization URL
 * User clicks this link and grants permission
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  try {
    // Check if credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error: 'Gmail credentials not configured',
          message: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local',
        },
        { status: 400 }
      );
    }

    // Build redirect URI from the actual request URL
    const url = new URL(request.url);
    const redirectUri = `${url.protocol}//${url.host}/api/auth/gmail/callback`;
    
    console.log('[GMAIL OAUTH] Using redirect URI:', redirectUri);

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Generate authorization URL
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
      prompt: 'consent', // Force consent screen every time
    });

    console.log('[GMAIL OAUTH] Authorization URL generated');

    return NextResponse.json({
      success: true,
      authUrl: authorizeUrl,
      instruction: 'Click the link below to authorize Gmail access:',
    });
  } catch (error: any) {
    console.error('[GMAIL OAUTH ERROR]', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
