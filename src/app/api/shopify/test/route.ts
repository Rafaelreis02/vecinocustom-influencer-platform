import { NextResponse } from 'next/server';
import { testShopifyConnection } from '@/lib/shopify-oauth';

/**
 * GET /api/shopify/test
 * Test Shopify API connection
 */
export async function GET() {
  try {
    const result = await testShopifyConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing Shopify connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
