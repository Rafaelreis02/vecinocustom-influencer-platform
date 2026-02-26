/**
 * Shopify API Integration
 * Handles coupon creation, retrieval, and order tracking
 */

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';

// Debug logging (remove in production)
console.log('[Shopify] Config check:', {
  hasStoreUrl: !!SHOPIFY_STORE_URL,
  storeUrl: SHOPIFY_STORE_URL?.substring(0, 10) + '...',
  hasClientId: !!SHOPIFY_CLIENT_ID,
  hasClientSecret: !!SHOPIFY_CLIENT_SECRET,
});

// Shopify REST API version
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
 * Build authorization header for Shopify API
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(
    `${SHOPIFY_CLIENT_ID}:${SHOPIFY_CLIENT_SECRET}`
  ).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Make authenticated request to Shopify GraphQL API
 */
async function shopifyGraphQL(query: string, variables?: Record<string, any>) {
  if (!SHOPIFY_STORE_URL || SHOPIFY_STORE_URL === 'admin') {
    throw new Error('SHOPIFY_STORE_URL not configured. Expected format: storename.myshopify.com');
  }

  // Ensure URL doesn't have protocol or trailing slashes
  const cleanStoreUrl = SHOPIFY_STORE_URL
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  const url = `https://${cleanStoreUrl}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.errors) {
    console.error('Shopify GraphQL errors:', data.errors);
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(data.errors)}`
    );
  }

  return data.data;
}

/**
 * Create a discount code (coupon) in Shopify
 * 10% discount for customer + 10% commission for influencer (calculated separately)
 */
export async function createCoupon(payload: CreateCouponPayload) {
  const mutation = `
    mutation CreateDiscount($input: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(input: $input) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
              startsAt
              endsAt
              status
              appliedCount
              usageLimit
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
              }
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
      combinesWith: {
        orderDiscounts: true,
        productDiscounts: true,
        shippingDiscounts: true,
      },
      customerGets: {
        value: {
          percentageValue: payload.discountPercentage,
        },
        items: {
          all: true,
        },
      },
      appliesOncePerCustomer: false,
      minimumRequirement: {
        subtotal: {
          greaterThanOrEqualToSubtotal: 0,
        },
      },
    },
  };

  try {
    const result = await shopifyGraphQL(mutation, variables);

    if (result.discountCodeBasicCreate.userErrors.length > 0) {
      throw new Error(
        `Failed to create coupon: ${JSON.stringify(
          result.discountCodeBasicCreate.userErrors
        )}`
      );
    }

    const couponNode = result.discountCodeBasicCreate.codeDiscountNode;
    return {
      success: true,
      coupon: {
        id: couponNode.id,
        title: couponNode.codeDiscount.title,
        code: couponNode.codeDiscount.codes.edges[0]?.node.code,
        status: couponNode.codeDiscount.status,
        discount: payload.discountPercentage,
      },
    };
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

/**
 * Get all discount codes from Shopify
 */
export async function getAllCoupons() {
  const query = `
    query {
      codeDiscountNodes(first: 50) {
        edges {
          node {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  edges {
                    node {
                      code
                    }
                  }
                }
                startsAt
                endsAt
                status
                appliedCount
                usageLimit
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(query);
    const coupons = result.codeDiscountNodes.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.codeDiscount.title,
      code: edge.node.codeDiscount.codes.edges[0]?.node.code,
      status: edge.node.codeDiscount.status,
      appliedCount: edge.node.codeDiscount.appliedCount,
      usageLimit: edge.node.codeDiscount.usageLimit,
    }));

    return coupons;
  } catch (error) {
    console.error('Error fetching coupons:', error);
    throw error;
  }
}

/**
 * Get orders that used a specific coupon code
 * Calculate commission based on order subtotal (excluding shipping + tax)
 */
export async function getOrdersByCounterCode(
  code: string
): Promise<ShopifyOrder[]> {
  const query = `
    query {
      orders(first: 50, query: "discount_code:${code}") {
        edges {
          node {
            id
            name
            email
            createdAt
            totalPrice
            subtotalPrice
            taxPrice
            shippingPrice
            discountApplications(first: 10) {
              edges {
                node {
                  ... on DiscountCode {
                    code
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(query);
    const orders = result.orders.edges.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      email: edge.node.email,
      createdAt: edge.node.createdAt,
      totalPrice: parseFloat(edge.node.totalPrice),
      subtotalPrice: parseFloat(edge.node.subtotalPrice),
      taxPrice: parseFloat(edge.node.taxPrice),
      shippingPrice: parseFloat(edge.node.shippingPrice),
      discountCode: code,
    }));

    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

/**
 * Test Shopify API connection
 */
export async function testShopifyConnection() {
  try {
    const query = `
      query {
        shop {
          name
          currencyCode
        }
      }
    `;

    const result = await shopifyGraphQL(query);
    return {
      success: true,
      shop: result.shop,
    };
  } catch (error) {
    console.error('Shopify connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
