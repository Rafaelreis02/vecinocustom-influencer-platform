'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Settings,
  FileText,
  Instagram,
  LogOut,
  X,
  Mail,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Influencers', href: '/dashboard/influencers', icon: Users },
  { name: 'Campanhas', href: '/dashboard/campaigns', icon: Target },
  { name: 'Mensagens', href: '/dashboard/messages', icon: Mail },
  { name: 'Comissões', href: '/dashboard/commissions', icon: DollarSign },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Integrações', href: '/dashboard/integrations', icon: Instagram },
  { name: 'Ficheiros', href: '/dashboard/files', icon: FileText },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "fixed md:static inset-y-0 left-0 z-50 md:z-0",
        "flex h-screen w-20 flex-col bg-gray-900",
        "transform transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo + Close Button (Mobile) */}
        <div className="flex h-16 items-center justify-center relative">
          <Link href="/dashboard" className="flex items-center justify-center">
            <div className="h-8 w-8 rounded bg-white flex items-center justify-center font-bold text-black text-sm">
              V
            </div>
          </Link>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="md:hidden absolute right-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            // Dashboard uses exact match, others use startsWith
            const isActive = item.href === '/dashboard' 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center px-2 py-3 text-[10px] font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-center leading-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-800 p-2 space-y-1">
          <Link
            href="/dashboard/settings"
            className="flex flex-col items-center justify-center px-2 py-3 text-[10px] font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-md transition-colors"
          >
            <Settings className="h-5 w-5 mb-1" />
            <span className="text-center leading-tight">Definições</span>
          </Link>
          <button
            className="w-full flex flex-col items-center justify-center px-2 py-3 text-[10px] font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-md transition-colors"
          >
            <LogOut className="h-5 w-5 mb-1" />
            <span className="text-center leading-tight">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
}
