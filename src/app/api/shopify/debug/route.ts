/**
 * GET /api/shopify/debug
 * 
 * Debug da configuração Shopify OAuth
 * Retorna as variáveis de ambiente relevantes (sem valores sensíveis)
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const clientId = process.env.SHOPIFY_CLIENT_ID || '';

  // Construir o redirect_uri que será usado
  const redirectUri = `${baseUrl}/api/shopify/callback`;

  // Verificar se as variáveis estão configuradas
  const config = {
    shopifyStoreUrl: shopifyStoreUrl ? '✅ Configurado' : '❌ Não configurado',
    baseUrl: baseUrl ? `✅ ${baseUrl}` : '❌ Não configurado',
    clientId: clientId ? '✅ Configurado' : '❌ Não configurado',
    redirectUri: redirectUri,
  };

  // Verificar se o URL é HTTPS (necessário para Shopify)
  const isHttps = baseUrl.startsWith('https://');

  // Instruções para corrigir o erro
  const instructions = `
ERRO: "redirect_uri and application url must have matching hosts"

SOLUÇÃO:
1. Vai à tua App Shopify (https://partners.shopify.com)
2. Edita a App > Configuração
3. Em "App URL", coloca exatamente: ${baseUrl}
4. Em "Allowed redirection URL(s)", adiciona: ${redirectUri}
5. Guarda as alterações

IMPORTANTE:
- O URL na App Shopify deve corresponder EXATAMENTE ao NEXT_PUBLIC_BASE_URL
- Se o site está em https://vecinocustom.vercel.app, a App URL deve ser https://vecinocustom.vercel.app (sem / no final)
- O redirect_uri será: https://vecinocustom.vercel.app/api/shopify/callback
  `;

  return NextResponse.json({
    config,
    isHttps: isHttps ? '✅ HTTPS ativado' : '⚠️ HTTPS não detectado (necessário para Shopify)',
    instructions,
    allConfigured: !!shopifyStoreUrl && !!baseUrl && !!clientId,
  });
}
