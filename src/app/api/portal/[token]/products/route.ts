import { NextResponse } from 'next/server';
import { getShopifyAccessToken } from '@/lib/shopify-oauth';
import { prisma } from '@/lib/prisma';

const API_VERSION = '2024-01';

// Get store URL from env or fallback to database
async function getStoreUrl(): Promise<string> {
  const envUrl = process.env.SHOPIFY_STORE_URL;
  if (envUrl) {
    console.log('[Portal Products API] Using SHOPIFY_STORE_URL from env');
    return envUrl;
  }
  
  console.log('[Portal Products API] SHOPIFY_STORE_URL not in env, fetching from DB...');
  try {
    const auth = await prisma.shopifyAuth.findFirst();
    if (auth?.shop) {
      console.log('[Portal Products API] Found shop in DB:', auth.shop);
      return auth.shop;
    }
  } catch (err) {
    console.error('[Portal Products API] Error fetching shop from DB:', err);
  }
  
  return '';
}

// GET /api/portal/[token]/products?q=searchterm - Search Shopify products using GraphQL
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

    // Get store URL (from env or fallback to DB)
    const SHOPIFY_STORE_URL = await getStoreUrl();
    
    if (!SHOPIFY_STORE_URL) {
      console.error('[Portal Products API] SHOPIFY_STORE_URL not configured');
      return NextResponse.json(
        { error: 'Shopify store not configured' },
        { status: 503 }
      );
    }
    
    console.log('[Portal Products API] Using store URL:', SHOPIFY_STORE_URL);

    // Get Shopify access token
    console.log('[Portal Products API] Getting access token from DB...');
    let accessToken = await getShopifyAccessToken();
    
    if (!accessToken) {
      console.error('[Portal Products API] No Shopify access token available');
      return NextResponse.json(
        { error: 'Shopify not configured' },
        { status: 503 }
      );
    }
    
    console.log('[Portal Products API] Token obtained, using GraphQL search');

    // Use GraphQL API for full-text search - much more efficient!
    const graphqlQuery = `
      query SearchProducts($query: String!) {
        products(first: 100, query: $query) {
          edges {
            node {
              id
              title
              handle
              tags
              featuredImage {
                url
              }
            }
          }
        }
      }
    `;

    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/graphql.json`;
    
    console.log('[Portal Products API] Calling GraphQL API with query:', query);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          query: query,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Portal Products API] GraphQL error:', response.status, errorText);
      return NextResponse.json(
        { error: `Shopify API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    console.log('[Portal Products API] GraphQL response received');
    console.log('[Portal Products API] Response has errors?', !!data.errors);
    console.log('[Portal Products API] Response data?', !!data.data);
    
    if (data.errors) {
      console.error('[Portal Products API] GraphQL errors:', JSON.stringify(data.errors, null, 2));
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    const edges = data.data?.products?.edges || [];
    console.log('[Portal Products API] GraphQL edges returned:', edges.length);
    
    const products = edges.map((edge: any) => {
      const node = edge.node;
      return {
        title: node.title,
        url: `https://${SHOPIFY_STORE_URL.replace('.myshopify.com', '')}.myshopify.com/products/${node.handle}`,
        image: node.featuredImage?.url || null,
      };
    });

    console.log('[Portal Products API] GraphQL search returned:', products.length, 'formatted products');
    console.log('[Portal Products API] First product:', products[0]);

    // Return top 4 results
    return NextResponse.json(products.slice(0, 4));

  } catch (err: any) {
    console.error('[API ERROR] Searching products:', err?.message || String(err));
    return NextResponse.json(
      { error: err?.message || 'Failed to search products' },
      { status: 500 }
    );
  }
}
