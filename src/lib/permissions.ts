import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { logger } from './logger';

export type UserRole = 'ADMIN' | 'ASSISTANT' | 'AI_AGENT';

export interface PermissionCheck {
  role: UserRole;
  action: string;
  resource: string;
}

/**
 * Verifica se o user tem permissão para uma ação
 * ASSISTANT (operacional) pode fazer tudo exceto:
 * - Gerir utilizadores
 * - Configurar integrações (Shopify, webhooks)
 * - Migração/reconfiguração de dados
 * - Apagar dados críticos
 */
export function checkPermission(role: UserRole, action: string, resource: string): boolean {
  // ADMIN pode tudo
  if (role === 'ADMIN') return true;
  
  // AI_AGENT - acesso via API para automação
  if (role === 'AI_AGENT') {
    // AI_AGENT pode fazer operações de leitura e algumas de escrita
    const allowedForAI = [
      'read:influencer',
      'read:campaign',
      'read:analytics',
      'create:prospect',
      'update:influencer-status',
      'read:email',
      'create:email-reply',
    ];
    return allowedForAI.includes(`${action}:${resource}`);
  }
  
  // ASSISTANT - operacional (não pode configurações críticas)
  if (role === 'ASSISTANT') {
    // Lista de recursos/actions que ASSISTANT NÃO pode fazer
    const restrictedForAssistant = [
      // Gestão de users
      'create:user',
      'update:user',
      'delete:user',
      'read:user', // lista de users
      
      // Configurações críticas
      'update:settings-shopify',
      'create:webhook-setup',
      'update:webhook-config',
      'execute:migration',
      'execute:auto-reconfigure',
      
      // Operações de sistema
      'delete:shopify-connection', // pode desligar mas não apagar config
      'update:email-signature-all', // só pode atualizar a sua
      
      // Seed/setup
      'execute:seed',
      'execute:init-templates',
      'execute:cleanup',
    ];
    
    if (restrictedForAssistant.includes(`${action}:${resource}`)) {
      logger.info(`[Permission] ASSISTANT blocked from ${action}:${resource}`);
      return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Middleware para verificar permissão em API routes
 * Uso: await requirePermission(req, 'update', 'influencer')
 */
export async function requirePermission(
  req: Request,
  action: string,
  resource: string
): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { allowed: false, error: 'Não autenticado' };
  }
  
  const role = session.user.role as UserRole;
  const hasPermission = checkPermission(role, action, resource);
  
  if (!hasPermission) {
    logger.warn(`[Permission] User ${session.user.email} (${role}) denied ${action}:${resource}`);
    return { allowed: false, user: session.user, error: 'Permissão negada' };
  }
  
  return { allowed: true, user: session.user };
}

/**
 * Verifica se é ADMIN
 */
export async function requireAdmin(req: Request): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { allowed: false, error: 'Não autenticado' };
  }
  
  if (session.user.role !== 'ADMIN') {
    return { allowed: false, user: session.user, error: 'Acesso restrito a ADMIN' };
  }
  
  return { allowed: true, user: session.user };
}

/**
 * Verifica se é ADMIN ou ASSISTANT (operacional)
 */
export async function requireOperational(req: Request): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { allowed: false, error: 'Não autenticado' };
  }
  
  const allowedRoles = ['ADMIN', 'ASSISTANT'];
  if (!allowedRoles.includes(session.user.role)) {
    return { allowed: false, user: session.user, error: 'Acesso restrito' };
  }
  
  return { allowed: true, user: session.user };
}

/**
 * Helper para verificar se ASSISTANT pode fazer uma ação específica
 * Retorna mensagem de erro específica
 */
export function getAssistantRestrictionMessage(action: string, resource: string): string | null {
  const restrictions: Record<string, string> = {
    'create:user': 'Apenas ADMIN pode criar utilizadores',
    'update:user': 'Apenas ADMIN pode editar utilizadores',
    'delete:user': 'Apenas ADMIN pode eliminar utilizadores',
    'update:settings-shopify': 'Apenas ADMIN pode configurar Shopify',
    'create:webhook-setup': 'Apenas ADMIN pode configurar webhooks',
    'execute:migration': 'Apenas ADMIN pode executar migrações',
    'execute:auto-reconfigure': 'Apenas ADMIN pode reconfigurar automações',
  };
  
  return restrictions[`${action}:${resource}`] || null;
}
