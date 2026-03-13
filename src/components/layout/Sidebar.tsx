'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  Settings,
  LogOut,
  X,
  Mail,
  UserCog,
} from 'lucide-react';
import { useRole, UserRole } from '@/hooks/useRole';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: UserRole[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ASSISTANT', 'AI_AGENT'] },
  { name: 'Influencers', href: '/dashboard/influencers', icon: Users, roles: ['ADMIN', 'ASSISTANT'] },
  { name: 'Campanhas', href: '/dashboard/campaigns', icon: Target, roles: ['ADMIN', 'ASSISTANT'] },
  { name: 'Emails', href: '/dashboard/messages', icon: Mail, roles: ['ADMIN', 'ASSISTANT'] },
  { name: 'Comissões', href: '/dashboard/commissions', icon: DollarSign, roles: ['ADMIN', 'ASSISTANT'] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, isAdmin, isLoading } = useRole();

  const filteredNavigation = navigation.filter((item) => {
    if (isLoading) return true;
    return role ? item.roles.includes(role) : false;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Minimalista */}
      <div className={clsx(
        "fixed md:static inset-y-0 left-0 z-50 md:z-0",
        "flex h-screen w-64 flex-col bg-white border-r border-gray-200/50",
        "transform transition-transform duration-300 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo + Close Button (Mobile) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#0E1E37] flex items-center justify-center font-bold text-white">
              V
            </div>
            <div>
              <span className="text-base font-semibold text-gray-900">VecinoCustom</span>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Main navigation">
          <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Menu
          </p>
          {filteredNavigation.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose?.()}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-[#0E1E37] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className={clsx(
                  "h-5 w-5",
                  isActive ? "text-white" : "text-gray-400"
                )} strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin-only items */}
        {isAdmin && (
          <div className="px-4 py-4 border-t border-gray-100">
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Admin
            </p>
            <Link
              href="/dashboard/users"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                pathname.startsWith('/dashboard/users')
                  ? 'bg-[#0E1E37] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <UserCog className={clsx(
                "h-5 w-5",
                pathname.startsWith('/dashboard/users') ? "text-white" : "text-gray-400"
              )} strokeWidth={1.5} />
              Utilizadores
            </Link>
          </div>
        )}

        {/* Bottom */}
        <div className="border-t border-gray-100 p-4 space-y-1">
          <Link
            href="/dashboard/settings"
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
              pathname.startsWith('/dashboard/settings')
                ? 'bg-[#0E1E37] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Settings className={clsx(
              "h-5 w-5",
              pathname.startsWith('/dashboard/settings') ? "text-white" : "text-gray-400"
            )} strokeWidth={1.5} />
            Definições
          </Link>
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            Sair
          </button>
        </div>
      </div>
    </>
  );
}
