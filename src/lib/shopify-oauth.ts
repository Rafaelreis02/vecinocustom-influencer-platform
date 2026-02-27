/**
 * Shopify API Integration with OAuth
 * Handles OAuth flow, coupon management, and order tracking
 */

import { prisma } from './prisma';
import crypto from 'crypto';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';

// Shopify REST API version
const API_VERSION = '2024-01';

interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping: string;
  discount_codes: Array<{ code: string; amount: string }>;
  created_at: string;
}

/**
 * Get the access token from database
 * Tries multiple shop URL formats for flexibility
 */
export async function getShopifyAccessToken(): Promise<string | null> {
  try {
    // Use SHOPIFY_SHOP_DOMAIN if available, fallback to SHOPIFY_STORE_URL
    const shopDomain = SHOPIFY_SHOP_DOMAIN || SHOPIFY_STORE_URL;
    
    if (!shopDomain) {
      console.log('[getShopifyAccessToken] No shop domain configured');
      return null;
    }
    
    // Normalize shop URL - remove protocol and trailing slashes
    const normalizedShop = shopDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    console.log('[getShopifyAccessToken] Looking for shop:', normalizedShop);

    // Try exact match first
    let auth: { accessToken: string } | null = await prisma.shopifyAuth.findUnique({
      where: { shop: normalizedShop },
    });

    // If not found, try with https:// prefix
    if (!auth) {
      auth = await prisma.shopifyAuth.findUnique({
        where: { shop: `https://${normalizedShop}` },
      });
    }

    // If still not found, try to find any shop that contains our domain
    if (!auth) {
      const allAuths = await prisma.shopifyAuth.findMany();
      console.log('[getShopifyAccessToken] Available shops:', allAuths.map(a => a.shop));

      const foundAuth = allAuths.find(a => {
        const authShop = a.shop.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        return authShop === normalizedShop || normalizedShop.includes(authShop);
      });
      
      if (foundAuth) {
        auth = foundAuth;
      }
    }

    console.log('[getShopifyAccessToken] Found auth record:', auth ? 'YES' : 'NO');
    return auth?.accessToken || null;
  } catch (error) {
    console.error('Error fetching Shopify access token:', error);
    return null;
  }
}

/**
 * Make authenticated request to Shopify REST API
 * Returns both data and response for header access
 */
async function shopifyRestAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: any; response: Response }> {
  const accessToken = await getShopifyAccessToken();
  
  if (!accessToken) {
    throw new Error('Shopify not connected. Please authenticate first.');
  }

  // Use SHOPIFY_SHOP_DOMAIN if available, fallback to SHOPIFY_STORE_URL
  const shopDomain = (SHOPIFY_SHOP_DOMAIN || SHOPIFY_STORE_URL)
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  
  if (!shopDomain) {
    throw new Error('Shopify shop domain not configured. Check SHOPIFY_SHOP_DOMAIN env var.');
  }

  const url = `https://${shopDomain}/admin/api/${API_VERSION}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return { data, response };
}

/**
 * Create a discount coupon in Shopify using REST API
 * Returns priceRuleId and discountCodeId
 */
export async function createShopifyCoupon(
  code: string,
  discountPercent: number
): Promise<{ priceRuleId: string; discountCodeId: string }> {
  try {
    // Step 1: Create price rule
    const { data: priceRuleData } = await shopifyRestAPI('/price_rules.json', {
      method: 'POST',
      body: JSON.stringify({
        price_rule: {
          title: `${code} - ${discountPercent}% discount`,
          target_type: 'line_item',
          target_selection: 'all',
          allocation_method: 'across',
          value_type: 'percentage',
          value: `-${discountPercent}`,
          customer_selection: 'all',
          starts_at: new Date().toISOString(),
          once_per_customer: true,
        },
      }),
    });

    const priceRuleId = priceRuleData.price_rule.id;

    // Step 2: Create discount code
    const { data: discountCodeData } = await shopifyRestAPI(
      `/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        body: JSON.stringify({
          discount_code: {
            code: code,
          },
        }),
      }
    );

    const discountCodeId = discountCodeData.discount_code.id;

    return {
      priceRuleId: priceRuleId.toString(),
      discountCodeId: discountCodeId.toString(),
    };
  } catch (error) {
    console.error('Error creating Shopify coupon:', error);
    throw error;
  }
}

/**
 * Delete a coupon from Shopify
 */
export async function deleteShopifyCoupon(priceRuleId: string): Promise<void> {
  try {
    console.log(`[deleteShopifyCoupon] Attempting to delete price rule: ${priceRuleId}`);
    const result = await shopifyRestAPI(`/price_rules/${priceRuleId}.json`, {
      method: 'DELETE',
    });
    console.log(`[deleteShopifyCoupon] Successfully deleted price rule: ${priceRuleId}`, result);
  } catch (error: any) {
    console.error(`[deleteShopifyCoupon] Error deleting price rule ${priceRuleId}:`, error.message);
    throw error;
  }
}

/**
 * Get orders that used a specific discount code
 * Handles pagination with page_info
 */
export async function getOrdersByDiscountCode(
  discountCode: string
): Promise<ShopifyOrder[]> {
  try {
    let allOrders: ShopifyOrder[] = [];
    let nextPageInfo: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const endpoint = nextPageInfo
        ? `/orders.json?page_info=${nextPageInfo}&status=any&limit=250`
        : `/orders.json?discount_code=${discountCode}&status=any&limit=250`;

      const { data, response } = await shopifyRestAPI(endpoint, { method: 'GET' });
      const orders = data.orders || [];

      // Filter orders that have the discount code
      const matchingOrders = orders.filter((order: any) =>
        order.discount_codes?.some(
          (dc: any) => dc.code === discountCode
        )
      );

      allOrders = [...allOrders, ...matchingOrders];

      // Check for pagination in Link header
      const linkHeader = response.headers.get('Link') || '';
      const nextLinkMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      
      if (nextLinkMatch) {
        const nextUrl = nextLinkMatch[1];
        const pageInfoMatch = nextUrl.match(/page_info=([^&]+)/);
        nextPageInfo = pageInfoMatch ? pageInfoMatch[1] : null;
        hasMore = !!nextPageInfo;
      } else {
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (allOrders.length >= 10000) {
        console.warn('Reached order limit of 10000');
        break;
      }
    }

    return allOrders;
  } catch (error) {
    console.error('Error fetching orders by discount code:', error);
    throw error;
  }
}

/**
 * Verify HMAC from Shopify OAuth callback
 */
export function verifyShopifyHmac(
  query: Record<string, string>,
  hmac: string
): boolean {
  // Create a copy without hmac
  const { hmac: _, ...params } = query;
  
  // Sort and create query string
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  // Generate HMAC
  const generatedHmac = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest('hex');

  return generatedHmac === hmac;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const url = `https://${shop}/admin/oauth/access_token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code: ${errorText}`);
  }

  return response.json();
}

/**
 * Test Shopify API connection
 */
export async function testShopifyConnection() {
  try {
    const accessToken = await getShopifyAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Not connected',
      };
    }

    const { data } = await shopifyRestAPI('/shop.json', { method: 'GET' });
    
    return {
      success: true,
      shop: data.shop,
    };
  } catch (error) {
    console.error('Shopify connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
