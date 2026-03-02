'use client';

import { useSession } from 'next-auth/react';

export type UserRole = 'ADMIN' | 'ASSISTANT' | 'AI_AGENT';

export interface UseRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  isAssistant: boolean;
  isAIAgent: boolean;
  isLoading: boolean;
  can: (action: string, resource: string) => boolean;
  canManageUsers: boolean;
  canConfigureIntegrations: boolean;
  canDelete: boolean;
}

export function useRole(): UseRoleReturn {
  const { data: session, status } = useSession();
  
  const role = (session?.user?.role as UserRole) || null;
  const isLoading = status === 'loading';
  
  const isAdmin = role === 'ADMIN';
  const isAssistant = role === 'ASSISTANT';
  const isAIAgent = role === 'AI_AGENT';
  
  // Verifica se pode fazer uma ação específica
  const can = (action: string, resource: string): boolean => {
    if (isAdmin) return true;
    
    // ASSISTANT não pode fazer certas ações
    if (isAssistant) {
      const restrictedActions = [
        'create:user', 'update:user', 'delete:user',
        'configure:shopify', 'configure:gmail', 'configure:webhooks',
        'execute:migration', 'execute:cleanup',
      ];
      return !restrictedActions.includes(`${action}:${resource}`);
    }
    
    return false;
  };
  
  // Permissões comuns
  const canManageUsers = isAdmin;
  const canConfigureIntegrations = isAdmin;
  const canDelete = isAdmin; // Apenas ADMIN pode eliminar
  
  return {
    role,
    isAdmin,
    isAssistant,
    isAIAgent,
    isLoading,
    can,
    canManageUsers,
    canConfigureIntegrations,
    canDelete,
  };
}
