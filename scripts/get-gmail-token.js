/**
 * Script para gerar novo token OAuth com permissões corretas
 * 
 * 1. Corre: node scripts/get-gmail-token.js
 * 2. Abre o URL que aparece no terminal
 * 3. Faz login com a conta vecino@vecinocustom.com
 * 4. Autoriza as permissões (enviar E ler emails)
 * 5. Copia o código que aparece e cola no terminal
 * 6. O script mostra o novo token - copia para o .env
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/auth/gmail/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Força a mostrar a tela de permissões novamente
});

console.log('\n🔗 Abre este URL no browser:');
console.log(authUrl);
console.log('\n📋 Ou espera que eu abra automaticamente...\n');

// Abrir automaticamente
open(authUrl).catch(() => {
  console.log('Não consegui abrir automaticamente. Copia o URL acima.');
});

// Criar servidor para receber o callback
const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  
  if (query.code) {
    try {
      const { tokens } = await oauth2Client.getToken(query.code);
      
      console.log('\n✅ Token obtido com sucesso!\n');
      console.log('📝 Refresh Token (copia para o .env):');
      console.log(tokens.refresh_token);
      console.log('\n⚠️  IMPORTANTE: Guarda este token no .env como:');
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\n🛑 Podes fechar o browser e parar o script (Ctrl+C)\n');
      
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`
        <h1>✅ Sucesso!</h1>
        <p>O token foi gerado. Verifica o terminal.</p>
        <p>Podes fechar esta página.</p>
      `);
      
    } catch (error) {
      console.error('❌ Erro:', error.message);
      res.writeHead(500);
      res.end('Erro ao obter token');
    }
    
    server.close();
  }
});

server.listen(3000, () => {
  console.log('⏳ Aguardando callback em http://localhost:3000...');
});
