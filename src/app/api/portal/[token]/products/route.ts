import { NextResponse } from 'next/server';
import { getShopifyAccessToken } from '@/lib/shopify-oauth';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const SHOPIFY_STATIC_ACCESS_TOKEN = process.env.SHOPIFY_STATIC_ACCESS_TOKEN || '';
const API_VERSION = '2024-01';

// GET /api/portal/[token]/products?q=searchterm - Search Shopify products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    console.log('[Portal Products API] Search query:', query);

    if (!query || query.length < 3) {
      console.warn('[Portal Products API] Query too short:', query?.length);
      return NextResponse.json([], { status: 200 });
    }

    // Check if Shopify is configured
    if (!SHOPIFY_STORE_URL) {
      console.error('[Portal Products API] SHOPIFY_STORE_URL not configured');
      return NextResponse.json(
        { error: 'Shopify store not configured' },
        { status: 503 }
      );
    }

    // Get Shopify access token (from DB or static env var)
    console.log('[Portal Products API] Getting access token from DB...');
    let accessToken = await getShopifyAccessToken();
    
    if (accessToken) {
      console.log('[Portal Products API] Got access token from DB');
    } else {
      console.warn('[Portal Products API] No token in DB, trying static...');
      // Fallback to static access token if OAuth not configured
      if (SHOPIFY_STATIC_ACCESS_TOKEN) {
        console.log('[Portal Products API] Using static Shopify access token');
        accessToken = SHOPIFY_STATIC_ACCESS_TOKEN;
      }
    }
    
    if (!accessToken) {
      console.error('[Portal Products API] No Shopify access token available (OAuth or static)');
      return NextResponse.json(
        { error: 'Shopify not configured' },
        { status: 503 }
      );
    }
    
    console.log('[Portal Products API] Token obtained, proceeding with search');

    // Search products using Shopify REST API
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json?limit=4&title=${encodeURIComponent(query)}`;

    console.log('[Portal Products API] Fetching from Shopify:', url);

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Portal Products API] Shopify error:', response.status, errorText);
      return NextResponse.json(
        { error: `Shopify API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const products = data.products || [];

    console.log('[Portal Products API] Found products:', products.length);

    // Return empty array if no products found (not demo data)
    if (products.length === 0) {
      return NextResponse.json([]);
    }

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
      { error: err?.message || 'Failed to search products' },
      { status: 500 }
    );
  }
}
