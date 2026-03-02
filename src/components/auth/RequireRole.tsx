'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type UserRole = 'ADMIN' | 'ASSISTANT' | 'AI_AGENT';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Componente que só renderiza children se o user tiver um dos roles permitidos
 * 
 * Exemplo:
 * <RequireRole allowedRoles={['ADMIN']}>
 *   <MenuItem>Utilizadores</MenuItem>
 * </RequireRole>
 */
export function RequireRole({ 
  children, 
  allowedRoles, 
  fallback = null,
  showLoading = true 
}: RequireRoleProps) {
  const { data: session, status } = useSession();
  
  // Loading state
  if (status === 'loading') {
    if (!showLoading) return null;
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }
  
  // Not authenticated
  if (!session?.user?.role) {
    return null;
  }
  
  // Check if user has required role
  const userRole = session.user.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    return fallback;
  }
  
  return <>{children}</>;
}

/**
 * Wrapper específico para ADMIN only
 */
export function RequireAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequireRole allowedRoles={['ADMIN']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

/**
 * Wrapper para ADMIN ou ASSISTANT (operacional)
 */
export function RequireOperational({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequireRole allowedRoles={['ADMIN', 'ASSISTANT']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}
