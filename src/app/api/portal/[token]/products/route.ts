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

    console.log('[Portal Products API] Search query:', query);

    if (!query || query.length < 3) {
      console.warn('[Portal Products API] Query too short:', query?.length);
      return NextResponse.json([], { status: 200 });
    }

    // Check if Shopify is configured
    if (!SHOPIFY_STORE_URL) {
      console.warn('[Portal Products API] SHOPIFY_STORE_URL not configured');
      return NextResponse.json(getDemoProducts(query), { status: 200 });
    }

    // Get Shopify access token
    const accessToken = await getShopifyAccessToken();
    
    if (!accessToken) {
      console.warn('[Portal Products API] No Shopify access token available');
      return NextResponse.json(getDemoProducts(query), { status: 200 });
    }

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
      // Fallback to demo data if Shopify fails
      return NextResponse.json(getDemoProducts(query), { status: 200 });
    }

    const data = await response.json();
    const products = data.products || [];

    console.log('[Portal Products API] Found products:', products.length);

    if (products.length === 0) {
      // Return demo data if no products found
      return NextResponse.json(getDemoProducts(query), { status: 200 });
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
    // Return demo data on error
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    return NextResponse.json(getDemoProducts(query), { status: 200 });
  }
}

// Demo products for fallback
function getDemoProducts(searchQuery: string) {
  const allProducts = [
    { title: 'Gold Necklace', handle: 'gold-necklace', image: null },
    { title: 'Silver Necklace', handle: 'silver-necklace', image: null },
    { title: 'Pearl Necklace', handle: 'pearl-necklace', image: null },
    { title: 'Gold Bracelet', handle: 'gold-bracelet', image: null },
    { title: 'Silver Bracelet', handle: 'silver-bracelet', image: null },
    { title: 'Diamond Ring', handle: 'diamond-ring', image: null },
    { title: 'Gold Ring', handle: 'gold-ring', image: null },
    { title: 'Pearl Earrings', handle: 'pearl-earrings', image: null },
    { title: 'Gold Earrings', handle: 'gold-earrings', image: null },
    { title: 'Gemstone Pendant', handle: 'gemstone-pendant', image: null },
  ];

  const filtered = allProducts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shopName = SHOPIFY_STORE_URL.replace('.myshopify.com', '') || 'vecinocustom';

  return filtered.map(product => ({
    title: product.title,
    url: `https://${shopName}.myshopify.com/products/${product.handle}`,
    image: null,
  }));
}
