/**
 * GET /api/shopify/auth
 * 
 * Inicia o fluxo OAuth com Shopify
 * Redireciona o user para a página de autorização da Shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Configurações da App Shopify
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom-influencer-platform.vercel.app';

// Scopes necessários (permissões)
const SHOPIFY_SCOPES = [
  'read_orders',
  'read_customers', 
  'read_discounts',
  'write_discounts',  // Para criar cupões
  'read_products',
].join(',');

export async function GET(request: NextRequest) {
  try {
    // Verificar se temos as credenciais configuradas
    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Shopify não configurado. Verifica as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // Obter shop domain (opcional, senão usa o default)
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    
    // Se não especificar shop, usa o da env var
    const shopDomain = shop || process.env.SHOPIFY_SHOP_DOMAIN;
    
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Loja Shopify não especificada' },
        { status: 400 }
      );
    }

    // Normalizar domain (adicionar .myshopify.com se não tiver)
    const normalizedShop = shopDomain.includes('.') 
      ? shopDomain 
      : `${shopDomain}.myshopify.com`;

    // Gerar state (CSRF protection)
    const state = crypto.randomBytes(16).toString('hex');
    
    // Guardar state num cookie temporário (1 hora)
    const redirectUrl = new URL('/api/shopify/callback', APP_URL).toString();
    
    // Construir URL de autorização
    const authUrl = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', SHOPIFY_CLIENT_ID);
    authUrl.searchParams.set('scope', SHOPIFY_SCOPES);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('state', state);

    // Criar response com redirect e cookie
    const response = NextResponse.redirect(authUrl.toString());
    
    // Guardar state e shop em cookies seguros
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hora
      path: '/',
    });
    
    response.cookies.set('shopify_oauth_shop', normalizedShop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('[Shopify Auth] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar autorização' },
      { status: 500 }
    );
  }
}
