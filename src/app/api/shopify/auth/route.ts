import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET /api/shopify/auth
 * Redirect to Shopify OAuth authorization
 */
export async function GET(request: NextRequest) {
  try {
    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_STORE_URL) {
      return NextResponse.json(
        { error: 'Shopify credentials not configured' },
        { status: 500 }
      );
    }

    // Generate state nonce for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Required scopes
    const scopes = [
      'read_orders',
      'write_price_rules',
      'read_price_rules',
      'write_discounts',
      'read_discounts',
    ].join(',');

    const redirectUri = `${NEXT_PUBLIC_BASE_URL}/api/shopify/callback`;

    // Build authorization URL
    const authUrl = new URL(`https://${SHOPIFY_STORE_URL}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', SHOPIFY_CLIENT_ID);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    // Store state in a cookie for verification
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Error in Shopify OAuth auth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
