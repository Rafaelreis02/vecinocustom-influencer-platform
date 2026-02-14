import { NextResponse } from 'next/server';
import { getShopifyAccessToken } from '@/lib/shopify-oauth';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const API_VERSION = '2024-01';

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

    // Check if Shopify is configured
    if (!SHOPIFY_STORE_URL) {
      console.error('[Portal Products API] SHOPIFY_STORE_URL not configured');
      return NextResponse.json(
        { error: 'Shopify store not configured' },
        { status: 503 }
      );
    }

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
    
    if (data.errors) {
      console.error('[Portal Products API] GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    const products = data.data?.products?.edges?.map((edge: any) => {
      const node = edge.node;
      return {
        title: node.title,
        url: `https://${SHOPIFY_STORE_URL.replace('.myshopify.com', '')}.myshopify.com/products/${node.handle}`,
        image: node.featuredImage?.url || null,
      };
    }) || [];

    console.log('[Portal Products API] GraphQL search returned:', products.length, 'products');

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
