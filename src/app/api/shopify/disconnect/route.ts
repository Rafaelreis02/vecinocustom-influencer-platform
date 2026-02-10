import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';

/**
 * POST /api/shopify/disconnect
 * Disconnect Shopify (delete access token)
 */
export async function POST() {
  try {
    await prisma.shopifyAuth.deleteMany({
      where: { shop: SHOPIFY_STORE_URL },
    });

    return NextResponse.json({
      success: true,
      message: 'Shopify disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting Shopify:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
