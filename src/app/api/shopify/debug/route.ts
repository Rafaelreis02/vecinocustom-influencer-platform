import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyAccessToken } from '@/lib/shopify-oauth';

/**
 * GET /api/shopify/debug
 * Diagnostic endpoint to check Shopify connection status
 */
export async function GET(req: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL ? '✅ Set' : '❌ Missing',
        SHOPIFY_SHOP_DOMAIN: process.env.SHOPIFY_SHOP_DOMAIN ? '✅ Set' : '❌ Missing',
        SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID ? '✅ Set' : '❌ Missing',
        SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_ID ? '✅ Set' : '❌ Missing',
      },
      database: {
        connections: [],
      },
      tokenLookup: null,
    };

    // Get all connections from database
    const allAuths = await prisma.shopifyAuth.findMany();
    results.database.connections = allAuths.map(auth => ({
      shop: auth.shop,
      hasToken: !!auth.accessToken,
      tokenPreview: auth.accessToken ? `${auth.accessToken.substring(0, 10)}...` : null,
      scope: auth.scope,
      updatedAt: auth.updatedAt,
    }));

    // Try to get token
    const token = await getShopifyAccessToken();
    results.tokenLookup = {
      found: !!token,
      preview: token ? `${token.substring(0, 10)}...` : null,
    };

    // Try to make a test API call
    if (token) {
      try {
        const shopDomain = (process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_STORE_URL || '')
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, '');
        
        const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': token,
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.apiTest = {
            success: true,
            shopName: data.shop?.name,
            shopEmail: data.shop?.email,
          };
        } else {
          results.apiTest = {
            success: false,
            status: response.status,
            error: await response.text(),
          };
        }
      } catch (error: any) {
        results.apiTest = {
          success: false,
          error: error.message,
        };
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Debug failed: ' + error.message },
      { status: 500 }
    );
  }
}
