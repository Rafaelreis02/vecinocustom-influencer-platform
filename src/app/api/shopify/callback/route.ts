/**
 * GET /api/shopify/callback
 * 
 * Recebe o callback do OAuth da Shopify
 * Troca o código por access token e guarda na BD
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vecinocustom-influencer-platform.vercel.app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Obter cookies
    const storedState = request.cookies.get('shopify_oauth_state')?.value;
    const storedShop = request.cookies.get('shopify_oauth_shop')?.value;

    // Criar response base (para limpar cookies)
    const response = NextResponse.redirect(`${APP_URL}/dashboard/settings?shopify=connected`);

    // Limpar cookies
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_oauth_shop');

    // Verificar erro
    if (error) {
      console.error('[Shopify Callback] OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?shopify=error&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validar state (CSRF protection)
    if (!state || state !== storedState) {
      console.error('[Shopify Callback] Invalid state');
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?shopify=error&message=Invalid+state`
      );
    }

    // Validar shop
    if (!shop || shop !== storedShop) {
      console.error('[Shopify Callback] Shop mismatch');
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?shopify=error&message=Shop+mismatch`
      );
    }

    // Validar código
    if (!code) {
      console.error('[Shopify Callback] No code received');
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?shopify=error&message=No+authorization+code`
      );
    }

    // Trocar código por access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Shopify Callback] Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?shopify=error&message=Token+exchange+failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;

    console.log('[Shopify Callback] Access token received:', { 
      shop, 
      scope,
      hasReadProducts: scope?.includes('read_products'),
      token_preview: access_token?.substring(0, 20) + '...'
    });

    if (!scope?.includes('read_products')) {
      console.warn('[Shopify Callback] WARNING: Token does not have read_products scope!');
    }

    // Guardar na base de dados
    await prisma.shopifyAuth.upsert({
      where: { shop },
      update: {
        accessToken: access_token,
        scope,
        updatedAt: new Date(),
      },
      create: {
        shop,
        accessToken: access_token,
        scope,
      },
    });

    console.log('[Shopify Callback] Connection saved to database', { shop, scope });

    // TODO: Registrar webhooks (opcional, para receber eventos em tempo real)
    // await registerWebhooks(shop, access_token);

    return response;

  } catch (error) {
    console.error('[Shopify Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?shopify=error&message=Unexpected+error`
    );
  }
}

/**
 * Registrar webhooks (exemplo)
 */
async function registerWebhooks(shop: string, accessToken: string) {
  const webhooks = [
    {
      topic: 'orders/create',
      address: `${APP_URL}/api/shopify/webhooks/orders`,
    },
    {
      topic: 'orders/updated',
      address: `${APP_URL}/api/shopify/webhooks/orders`,
    },
  ];

  for (const webhook of webhooks) {
    try {
      await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhook }),
      });
    } catch (error) {
      console.error('[Shopify Webhooks] Failed to register:', webhook.topic, error);
    }
  }
}
