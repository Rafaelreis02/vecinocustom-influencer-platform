'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Target,
  Ticket,
  DollarSign,
  TrendingUp,
  Settings,
  FileText,
  Instagram,
  LogOut,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Influencers', href: '/dashboard/influencers', icon: Users },
  { name: 'Campanhas', href: '/dashboard/campaigns', icon: Target },
  { name: 'Cupões', href: '/dashboard/coupons', icon: Ticket },
  { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign },
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
        "flex h-screen w-64 flex-col bg-white border-r border-gray-200",
        "transform transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo + Close Button (Mobile) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-black flex items-center justify-center font-bold text-white text-sm">
              V
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">VecinoCustom</span>
            </div>
          </Link>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <Link
            href="/dashboard/settings"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Settings className="mr-3 h-5 w-5" />
            Definições
          </Link>
          <button
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
}
