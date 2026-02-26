/**
 * Shopify API Integration
 * Handles coupon creation, retrieval, and order tracking
 */

const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';

// Debug logging (remove in production)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Shopify] Config check:', {
    hasShopDomain: !!SHOPIFY_SHOP_DOMAIN,
    shopDomain: SHOPIFY_SHOP_DOMAIN,
    hasAccessToken: !!SHOPIFY_ACCESS_TOKEN,
  });
}

// Shopify Admin API version
const API_VERSION = '2025-01';

interface ShopifyCoupon {
  id: string;
  title: string;
  code: string;
  discountClass: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  usageLimit: number | null;
  appliedCount: number;
}

interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  totalPrice: number;
  subtotalPrice: number;
  taxPrice: number;
  shippingPrice: number;
  discountAmount: number;
  discountCode: string;
  createdAt: string;
}

interface CreateCouponPayload {
  title: string;
  code: string;
  discountPercentage: number; // e.g., 10 for 10%
  usageLimit?: number;
  expiresAt?: string;
}

/**
 * Check if Shopify is configured
 */
export function isShopifyConfigured(): boolean {
  return !!SHOPIFY_SHOP_DOMAIN && !!SHOPIFY_ACCESS_TOKEN;
}

/**
 * Make authenticated request to Shopify GraphQL API
 * Uses Access Token authentication (not Basic Auth)
 */
async function shopifyGraphQL(query: string, variables?: Record<string, any>) {
  if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error(
      'Shopify not configured. Missing: ' + 
      [!SHOPIFY_SHOP_DOMAIN && 'SHOPIFY_SHOP_DOMAIN', !SHOPIFY_ACCESS_TOKEN && 'SHOPIFY_ACCESS_TOKEN'].filter(Boolean).join(', ')
    );
  }

  // Ensure domain doesn't have protocol or trailing slashes
  const cleanDomain = SHOPIFY_SHOP_DOMAIN
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  const url = `https://${cleanDomain}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Shopify] API error response:', errorText);
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.errors) {
    console.error('[Shopify] GraphQL errors:', data.errors);
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(data.errors)}`
    );
  }

  return data.data;
}

/**
 * Create a discount code (coupon) in Shopify
 * 10% discount for customer + 20% commission for influencer (calculated separately)
 */
export async function createCoupon(payload: CreateCouponPayload) {
  const mutation = `
    mutation CreateDiscount($input: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(input: $input) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              id
              title
              code
              discountClass
              startsAt
              endsAt
              status
              usageLimit
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      title: payload.title,
      code: payload.code,
      startsAt: new Date().toISOString(),
      endsAt: payload.expiresAt || null,
      usageLimit: payload.usageLimit || null,
      customerSelection: {
        all: true,
      },
      customerGets: {
        value: {
          percentage: payload.discountPercentage,
        },
        items: {
          all: true,
        },
      },
      appliesOncePerCustomer: false,
    },
  };

  const data = await shopifyGraphQL(mutation, variables);

  if (data.discountCodeBasicCreate.userErrors.length > 0) {
    throw new Error(
      `Shopify error: ${data.discountCodeBasicCreate.userErrors[0].message}`
    );
  }

  const coupon = data.discountCodeBasicCreate.codeDiscountNode.codeDiscount;

  return {
    success: true,
    coupon: {
      id: coupon.id,
      title: coupon.title,
      code: coupon.code,
      discountClass: coupon.discountClass,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      status: coupon.status,
      usageLimit: coupon.usageLimit,
    },
  };
}

/**
 * Get coupon by code from Shopify
 */
export async function getCouponByCode(code: string): Promise<ShopifyCoupon | null> {
  const query = `
    query GetDiscountCodes($query: String!) {
      codeDiscountNodes(query: $query, first: 1) {
        edges {
          node {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                id
                title
                code
                discountClass
                startsAt
                endsAt
                status
                usageLimit
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `code:${code}` });

  const edge = data.codeDiscountNodes.edges[0];
  if (!edge) return null;

  const coupon = edge.node.codeDiscount;
  return {
    id: coupon.id,
    title: coupon.title,
    code: coupon.code,
    discountClass: coupon.discountClass,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    status: coupon.status,
    usageLimit: coupon.usageLimit,
    appliedCount: 0, // Not directly available in this query
  };
}

/**
 * Get orders by discount code from Shopify
 */
export async function getOrdersByDiscountCode(code: string): Promise<ShopifyOrder[]> {
  const query = `
    query GetOrders($query: String!) {
      orders(query: $query, first: 50) {
        edges {
          node {
            id
            name
            email
            totalPriceSet {
              shopMoney {
                amount
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
              }
            }
            totalTaxSet {
              shopMoney {
                amount
              }
            }
            totalShippingPriceSet {
              shopMoney {
                amount
              }
            }
            totalDiscountsSet {
              shopMoney {
                amount
              }
            }
            discountCode
            createdAt
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { query: `discount_code:${code}` });

  return data.orders.edges.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    email: edge.node.email,
    totalPrice: parseFloat(edge.node.totalPriceSet.shopMoney.amount),
    subtotalPrice: parseFloat(edge.node.subtotalPriceSet.shopMoney.amount),
    taxPrice: parseFloat(edge.node.totalTaxSet.shopMoney.amount),
    shippingPrice: parseFloat(edge.node.totalShippingPriceSet.shopMoney.amount),
    discountAmount: parseFloat(edge.node.totalDiscountsSet.shopMoney.amount),
    discountCode: edge.node.discountCode,
    createdAt: edge.node.createdAt,
  }));
}

/**
 * Delete a discount code from Shopify
 */
export async function deleteCoupon(shopifyId: string) {
  const mutation = `
    mutation DeleteDiscount($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, { id: shopifyId });

  if (data.discountCodeDelete.userErrors.length > 0) {
    throw new Error(
      `Shopify error: ${data.discountCodeDelete.userErrors[0].message}`
    );
  }

  return {
    success: true,
    deletedId: data.discountCodeDelete.deletedCodeDiscountId,
  };
}
