/**
 * POST /api/settings/shopify/test
 * 
 * Testar conexão com Shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Shopify não configurado. Preenche as configurações primeiro.' },
        { status: 400 }
      );
    }

    // Testar conexão com Shopify
    try {
      const response = await fetch(`https://${storeUrl}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Shopify API error: ${error}`);
      }

      const data = await response.json();

      logger.info('[API] Shopify connection test successful', { 
        shop: data.shop?.name,
        email: data.shop?.email,
      });

      return NextResponse.json({
        success: true,
        shop: {
          name: data.shop?.name,
          email: data.shop?.email,
          domain: data.shop?.domain,
        },
      });

    } catch (error: any) {
      logger.error('[API] Shopify connection test failed', { error: error.message });
      return NextResponse.json(
        { error: 'Falha na conexão com Shopify: ' + error.message },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('[API] Error testing Shopify connection', { error });
    return handleApiError(error);
  }
}
