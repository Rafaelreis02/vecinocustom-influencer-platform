/**
 * POST /api/shopify/disconnect
 * 
 * Remove a conexão com a Shopify
 * Apaga o token da base de dados
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (qualquer user autenticado pode desconectar)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    // Allow ADMIN e ASSISTANT (users que conseguem aceder ao settings)
    if (!['ADMIN', 'ASSISTANT'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas ADMIN ou ASSISTANT podem desconectar' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const shop = body.shop || process.env.SHOPIFY_SHOP_DOMAIN;

    if (!shop) {
      return NextResponse.json(
        { error: 'Loja não especificada' },
        { status: 400 }
      );
    }

    const normalizedShop = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    // Verificar se existe conexão
    const connection = await prisma.shopifyAuth.findUnique({
      where: { shop: normalizedShop },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Loja não está conectada' },
        { status: 404 }
      );
    }

    // TODO: Opcional - revogar token na Shopify (se a API permitir)
    // Por agora só removemos da nossa BD

    // Apagar da base de dados
    await prisma.shopifyAuth.delete({
      where: { shop: normalizedShop },
    });

    console.log('[Shopify Disconnect] Connection removed:', normalizedShop);

    return NextResponse.json({
      success: true,
      message: 'Conexão removida com sucesso',
      shop: normalizedShop,
    });

  } catch (error) {
    console.error('[Shopify Disconnect] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao desconectar', details: errorMessage },
      { status: 500 }
    );
  }
}
