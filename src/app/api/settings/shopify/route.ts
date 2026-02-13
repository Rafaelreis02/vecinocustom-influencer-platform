/**
 * GET /api/settings/shopify
 * POST /api/settings/shopify
 * POST /api/settings/shopify/test
 * 
 * Gerir configuração da integração Shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Simular storage de configurações (em produção usar tabela Settings)
// Por agora usamos variáveis de ambiente

// GET - Obter configuração atual
export async function GET() {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const storeUrl = process.env.SHOPIFY_STORE_URL || '';
    const apiKey = process.env.SHOPIFY_API_KEY || '';
    
    // Retornar só o que é seguro (não retornamos secrets)
    return NextResponse.json({
      storeUrl,
      apiKey,
      isConfigured: !!(storeUrl && apiKey && process.env.SHOPIFY_ACCESS_TOKEN),
    });

  } catch (error) {
    logger.error('[API] Error getting Shopify settings', { error });
    return handleApiError(error);
  }
}

// POST - Guardar configuração
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

    const body = await request.json();
    const { storeUrl, apiKey, apiSecret, accessToken } = body;

    // Validação básica
    if (!storeUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Store URL e API Key são obrigatórios' },
        { status: 400 }
      );
    }

    // NOTA: Em produção, guardar encriptado na BD
    // Por agora só validamos e logamos
    logger.info('[API] Shopify settings updated', { 
      storeUrl, 
      apiKeyPresent: !!apiKey,
      apiSecretPresent: !!apiSecret,
      accessTokenPresent: !!accessToken,
    });

    // Em produção, atualizar variáveis de ambiente ou tabela Settings
    return NextResponse.json({ 
      success: true, 
      message: 'Configuração guardada (simulação - atualizar env vars na produção)',
    });

  } catch (error) {
    logger.error('[API] Error saving Shopify settings', { error });
    return handleApiError(error);
  }
}
