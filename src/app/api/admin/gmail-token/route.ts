import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes necessários
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// Endpoint 1: Gerar URL de autorização
export async function GET(request: NextRequest) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  return NextResponse.json({
    url: authUrl,
    message: 'Abre este URL no browser e faz login com brand@vecinocustom.com',
  });
}

// Endpoint 2: Receber o código e trocar por token
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    const { tokens } = await oauth2Client.getToken(code);
    
    return NextResponse.json({
      success: true,
      refreshToken: tokens.refresh_token,
      message: 'Copia o refreshToken acima e guarda no 1Password e no Vercel (GOOGLE_REFRESH_TOKEN)',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get token', message: error.message },
      { status: 500 }
    );
  }
}
