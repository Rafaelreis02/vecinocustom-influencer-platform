import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyShopifyHmac, exchangeCodeForToken } from '@/lib/shopify-oauth';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/shopify/callback
 * Handle Shopify OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const code = searchParams.get('code');
    const hmac = searchParams.get('hmac');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');

    // Verify required parameters
    if (!code || !hmac || !shop || !state) {
      return NextResponse.redirect(
        `${NEXT_PUBLIC_BASE_URL}/dashboard/settings?error=missing_params`
      );
    }

    // Verify state (CSRF protection)
    const savedState = request.cookies.get('shopify_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${NEXT_PUBLIC_BASE_URL}/dashboard/settings?error=invalid_state`
      );
    }

    // Build query object for HMAC verification
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'hmac') {
        query[key] = value;
      }
    });

    // Verify HMAC
    if (!verifyShopifyHmac(query, hmac)) {
      return NextResponse.redirect(
        `${NEXT_PUBLIC_BASE_URL}/dashboard/settings?error=invalid_hmac`
      );
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(shop, code);

    // Save to database
    await prisma.shopifyAuth.upsert({
      where: { shop: SHOPIFY_STORE_URL },
      update: {
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
      },
      create: {
        shop: SHOPIFY_STORE_URL,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
      },
    });

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(
      `${NEXT_PUBLIC_BASE_URL}/dashboard/settings?shopify=connected`
    );
    response.cookies.delete('shopify_oauth_state');

    return response;
  } catch (error) {
    console.error('Error in Shopify OAuth callback:', error);
    return NextResponse.redirect(
      `${NEXT_PUBLIC_BASE_URL}/dashboard/settings?error=connection_failed`
    );
  }
}
