import { NextResponse } from 'next/server';
import { getShopifyAccessToken } from '@/lib/shopify-oauth';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const API_VERSION = '2024-01';

// GET /api/portal/[token]/products?q=searchterm - Search Shopify products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Search query must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Get Shopify access token
    const accessToken = await getShopifyAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 503 }
      );
    }

    // Search products using Shopify REST API
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json?limit=4&title=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const products = data.products || [];

    // Format products for portal
    // Extract shop name from SHOPIFY_STORE_URL (e.g., "mystore.myshopify.com" -> "mystore")
    const shopName = SHOPIFY_STORE_URL.replace('.myshopify.com', '');
    
    const formattedProducts = products.map((product: any) => ({
      title: product.title,
      url: `https://${shopName}.myshopify.com/products/${product.handle}`,
      image: product.images?.[0]?.src || product.image?.src || null,
    }));

    return NextResponse.json(formattedProducts);
  } catch (err: any) {
    console.error('[API ERROR] Searching products:', err?.message || String(err));
    return NextResponse.json(
      { error: 'Failed to search products', details: err?.message },
      { status: 500 }
    );
  }
}
