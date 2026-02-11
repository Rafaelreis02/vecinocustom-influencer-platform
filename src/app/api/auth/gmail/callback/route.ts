/**
 * Gmail OAuth2 Callback
 * 
 * GET /api/auth/gmail/callback?code=...
 * 
 * Handles the OAuth2 callback from Google
 * Exchanges authorization code for refresh token
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle error
    if (error) {
      console.error('[GMAIL OAUTH] Error from Google:', error);
      return NextResponse.json(
        { error: `Google auth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Build redirect URI from the actual request URL
    const url = new URL(request.url);
    const redirectUri = `${url.protocol}//${url.host}/api/auth/gmail/callback`;
    
    console.log('[GMAIL OAUTH] Using redirect URI:', redirectUri);

    // Create OAuth2 client with the correct redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Exchange code for tokens
    console.log('[GMAIL OAUTH] Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);

    console.log('[GMAIL OAUTH] Got tokens');
    console.log('[GMAIL OAUTH] Refresh Token:', tokens.refresh_token);

    // Return refresh token to user (need to save to .env)
    return NextResponse.json({
      success: true,
      message: 'Authorization successful!',
      refreshToken: tokens.refresh_token,
      instruction: '📝 Add this to your .env.local: GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token,
    });
  } catch (error: any) {
    console.error('[GMAIL OAUTH ERROR]', error.message);
    return NextResponse.json(
      { error: error.message || 'OAuth callback failed' },
      { status: 500 }
    );
  }
}
