/**
 * GET /api/shopify/auth
 * 
 * Conecta usando o token da env var (Custom App já instalado)
 * Valida o token e guarda na BD
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;

export async function GET(request: NextRequest) {
  try {
    // Verificar se temos o token configurado
    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_SHOP_DOMAIN) {
      return NextResponse.json(
        { error: 'Token Shopify não configurado nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const shop = SHOPIFY_SHOP_DOMAIN.includes('.myshopify.com') 
      ? SHOPIFY_SHOP_DOMAIN 
      : `${SHOPIFY_SHOP_DOMAIN}.myshopify.com`;

    // Testar se o token é válido
    const testResponse = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        },
      }
    );

    if (!testResponse.ok) {
      const error = await testResponse.text();
      console.error('[Shopify Auth] Token inválido:', error);
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const shopData = await testResponse.json();

    // Guardar na BD
    await prisma.shopifyAuth.upsert({
      where: { shop },
      update: {
        accessToken: SHOPIFY_ACCESS_TOKEN,
        scope: 'read_orders,read_customers,read_discounts,write_discounts,read_products',
        updatedAt: new Date(),
      },
      create: {
        shop,
        accessToken: SHOPIFY_ACCESS_TOKEN,
        scope: 'read_orders,read_customers,read_discounts,write_discounts,read_products',
      },
    });

    console.log('[Shopify Auth] Conectado com sucesso:', shop);

    return NextResponse.json({
      success: true,
      shop: shopData.shop,
      message: 'Shopify conectado com sucesso',
    });

  } catch (error) {
    console.error('[Shopify Auth] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar com Shopify' },
      { status: 500 }
    );
  }
}
