/**
 * GET /api/shopify/check
 * 
 * Verifica se a loja Shopify está conectada
 * Retorna status e informações básicas
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop') || process.env.SHOPIFY_SHOP_DOMAIN;

    if (!shop) {
      return NextResponse.json(
        { error: 'Loja não especificada' },
        { status: 400 }
      );
    }

    const normalizedShop = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    // Buscar conexão na BD
    const connection = await prisma.shopifyAuth.findUnique({
      where: { shop: normalizedShop },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        shop: normalizedShop,
      });
    }

    // Verificar se o token ainda é válido (opcional - faz uma chamada de teste)
    let isValid = true;
    let shopInfo = null;

    try {
      const shopResponse = await fetch(
        `https://${normalizedShop}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': connection.accessToken,
          },
        }
      );

      if (shopResponse.ok) {
        const data = await shopResponse.json();
        shopInfo = {
          name: data.shop.name,
          domain: data.shop.domain,
          email: data.shop.email,
          plan: data.shop.plan_name,
        };
      } else {
        isValid = false;
      }
    } catch (error) {
      isValid = false;
    }

    return NextResponse.json({
      connected: true,
      shop: normalizedShop,
      isValid,
      scopes: connection.scope?.split(',') || [],
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      shopInfo,
    });

  } catch (error) {
    console.error('[Shopify Check] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar conexão' },
      { status: 500 }
    );
  }
}
