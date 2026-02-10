import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';

/**
 * GET /api/shopify/status
 * Check if Shopify is connected
 */
export async function GET() {
  try {
    const auth = await prisma.shopifyAuth.findUnique({
      where: { shop: SHOPIFY_STORE_URL },
    });

    if (!auth) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      shop: {
        name: SHOPIFY_STORE_URL,
        connectedAt: auth.createdAt,
      },
    });
  } catch (error) {
    console.error('Error checking Shopify status:', error);
    return NextResponse.json(
      { connected: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
