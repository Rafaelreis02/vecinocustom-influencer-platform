import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const redirectUri = appUrl + '/api/auth/gmail/callback';

  const diagnostics: any = {
    clientId: clientId ? `${clientId.substring(0, 20)}... (${clientId.length} chars)` : '❌ MISSING',
    clientSecret: clientSecret ? `${clientSecret.substring(0, 5)}... (${clientSecret.length} chars)` : '❌ MISSING',
    refreshToken: refreshToken ? `${refreshToken.substring(0, 10)}... (${refreshToken.length} chars)` : '❌ MISSING',
    appUrl: appUrl || '❌ MISSING',
    redirectUri,
    gmailUser: process.env.GMAIL_USER || '❌ MISSING',
  };

  // Test OAuth
  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    diagnostics.tokenRefresh = '✅ SUCCESS';
    diagnostics.accessToken = credentials.access_token ? 'Present' : 'Missing';
    diagnostics.expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'Unknown';
  } catch (error: any) {
    diagnostics.tokenRefresh = '❌ FAILED';
    diagnostics.error = error.message;
    
    // Try to get more details from the error response
    if (error.response?.data) {
      diagnostics.errorDetails = error.response.data;
    }
  }

  return NextResponse.json(diagnostics);
}
