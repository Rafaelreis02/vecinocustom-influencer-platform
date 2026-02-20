import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * API Key Authentication
 * Para agents/automação (Scott, etc)
 */

export interface ApiKeyAuthResult {
  success: boolean;
  userId?: string;
  role?: string;
  error?: string;
}

/**
 * Valida um API key do tipo "vecino_sk_xxxx"
 * Usado por agents e automação
 */
export async function validateApiKey(authHeader: string | null): Promise<ApiKeyAuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  
  // Formato esperado: "vecino_sk_xxxxxxxx"
  if (!token.startsWith('vecino_sk_')) {
    return { success: false, error: 'Invalid token format' };
  }

  try {
    // Procurar user com este API key (comparar hash)
    // Como bcrypt não permite "find by hash", procuramos users AI_AGENT e verificamos um a um
    const agents = await prisma.user.findMany({
      where: { role: 'AI_AGENT' },
      select: { id: true, role: true, password: true, name: true }
    });

    for (const agent of agents) {
      if (agent.password && await bcrypt.compare(token, agent.password)) {
        return { 
          success: true, 
          userId: agent.id, 
          role: agent.role 
        };
      }
    }

    return { success: false, error: 'Invalid API key' };
  } catch (error) {
    console.error('[ApiAuth] Error validating key:', error);
    return { success: false, error: 'Authentication error' };
  }
}

/**
 * Gera um novo API key para um agent
 * Retorna o token (apenas mostrado uma vez!)
 */
export async function generateApiKey(userId: string): Promise<string | null> {
  try {
    // Gerar token aleatório
    const token = `vecino_sk_${Buffer.from(crypto.randomUUID()).toString('base64url').slice(0, 32)}`;
    
    // Hash para guardar na DB
    const hashed = await bcrypt.hash(token, 10);
    
    // Atualizar user
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });

    return token;
  } catch (error) {
    console.error('[ApiAuth] Error generating key:', error);
    return null;
  }
}
