import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:Arial;text-align:center;padding:50px;">
        <h1>❌ Erro</h1>
        <p>${error}</p>
        <a href="/admin/gmail-auth">Tentar novamente</a>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Mostrar o token numa página bonita
    return new NextResponse(`
      <html>
      <body style="font-family:Arial;max-width:600px;margin:50px auto;padding:20px;">
        <h1 style="color:#16a34a;">✅ Token Gerado!</h1>
        <p>Copia o refresh token abaixo:</p>
        <div style="background:#1e293b;color:#4ade80;padding:20px;border-radius:12px;word-break:break-all;font-family:monospace;font-size:14px;margin:20px 0;">
          ${tokens.refresh_token || 'NENHUM TOKEN GERADO - tenta novamente com prompt=consent'}
        </div>
        <h3>📋 Próximos passos:</h3>
        <ol style="line-height:2;">
          <li>Copia o token acima</li>
          <li>Vai ao <strong>Vercel Dashboard → Settings → Environment Variables</strong></li>
          <li>Atualiza <code>GOOGLE_REFRESH_TOKEN</code></li>
          <li>Faz <strong>Redeploy</strong></li>
        </ol>
      </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err: any) {
    return new NextResponse(`
      <html><body style="font-family:Arial;text-align:center;padding:50px;">
        <h1>❌ Erro ao obter token</h1>
        <p style="color:red;">${err.message}</p>
        <a href="/admin/gmail-auth">Tentar novamente</a>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
