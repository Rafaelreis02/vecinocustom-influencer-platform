/**
 * Gerar Token OAuth para Gmail API
 * 
 * Como usar:
 * 1. Coloca este ficheiro na raiz do projeto
 * 2. Corre: node get-gmail-token.js
 * 3. Abre o URL que aparece no browser
 * 4. Faz login com brand@vecinocustom.com
 * 5. Copia o código que aparece e cola no terminal
 * 6. O token aparece - guarda no 1Password!
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

// Vais buscar estes valores ao teu .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'COLOCA_AQUI_O_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'COLOCA_AQUI_O_CLIENT_SECRET';

if (CLIENT_ID.includes('COLOCA_AQUI')) {
  console.log('❌ Precisas de editar este ficheiro e colocar:');
  console.log('   - GOOGLE_CLIENT_ID');
  console.log('   - GOOGLE_CLIENT_SECRET');
  console.log('\nVai buscar ao ficheiro .env ou ao 1Password');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000/api/auth/gmail/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🌐 A abrir o browser automaticamente...\n');
console.log('Se não abrir, copia este URL manualmente:');
console.log(authUrl);
console.log('\n');

// Abrir browser automaticamente
open(authUrl).catch(() => {
  console.log('⚠️ Não consegui abrir o browser automaticamente');
  console.log('Copia o URL acima e abre manualmente\n');
});

// Criar servidor para receber o callback
const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  
  if (query.code) {
    try {
      console.log('✅ Código recebido! A trocar por token...\n');
      
      const { tokens } = await oauth2Client.getToken(query.code);
      
      console.log('🎉 TOKEN GERADO COM SUCESSO!\n');
      console.log('=================================');
      console.log('REFRESH TOKEN (copia isto):');
      console.log(tokens.refresh_token);
      console.log('=================================\n');
      console.log('⚠️  INSTRUÇÕES:');
      console.log('1. Copia o token acima (começa com 1//...)');
      console.log('2. Guarda no 1Password com nome: GOOGLE_REFRESH_TOKEN');
      console.log('3. Vai ao Vercel Dashboard > Settings > Environment Variables');
      console.log('4. Atualiza a variável GOOGLE_REFRESH_TOKEN');
      console.log('5. Faz Redeploy\n');
      
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>✅ Sucesso!</h1>
            <p>O token foi gerado. Verifica o terminal.</p>
            <p>Podes fechar esta página.</p>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Erro:', error.message);
      res.writeHead(500);
      res.end('Erro ao obter token');
    }
    
    server.close();
    process.exit(0);
  }
});

server.listen(3000, () => {
  console.log('⏳ À espera do login... (servidor em http://localhost:3000)');
});
