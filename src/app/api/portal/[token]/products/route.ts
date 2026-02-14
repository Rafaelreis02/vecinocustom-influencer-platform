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
    // First, get all products (limit to reasonable number) to search client-side
    // This allows us to search by title, tags, and other fields
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/products.json?limit=250&fields=id,title,handle,tags,images`;

    console.log('[Portal Products API] Fetching from Shopify with query:', query);

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
    let products = data.products || [];

    // Filter products by query - search in title and tags
    const lowerQuery = query.toLowerCase();
    const filtered = products.filter((product: any) => {
      const titleMatch = product.title.toLowerCase().includes(lowerQuery);
      const tagsMatch = product.tags && product.tags.toLowerCase().includes(lowerQuery);
      return titleMatch || tagsMatch;
    });

    console.log('[Portal Products API] Found products:', filtered.length, '(from', products.length, 'total)');

    // Return empty array if no products found
    if (filtered.length === 0) {
      console.log('[Portal Products API] No products found for query:', query);
      return NextResponse.json([]);
    }

    products = filtered;

    // Format products for portal - limit to 4 results
    // Extract shop name from SHOPIFY_STORE_URL (e.g., "mystore.myshopify.com" -> "mystore")
    const shopName = SHOPIFY_STORE_URL.replace('.myshopify.com', '');
    
    const formattedProducts = products
      .slice(0, 4)  // Limit to 4 results
      .map((product: any) => ({
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
