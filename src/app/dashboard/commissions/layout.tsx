'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  Wallet, 
  CheckCircle 
} from 'lucide-react';

const tabs = [
  { 
    id: 'overview', 
    label: 'Total', 
    href: '/dashboard/commissions',
    icon: LayoutDashboard,
    description: 'Estatísticas gerais'
  },
  { 
    id: 'pending', 
    label: 'Pendentes', 
    href: '/dashboard/commissions/pending',
    icon: Clock,
    description: 'Aprovar/rejeitar'
  },
  { 
    id: 'payments', 
    label: 'Pagamentos', 
    href: '/dashboard/commissions/payments',
    icon: Wallet,
    description: 'Marcar como pago'
  },
  { 
    id: 'paid', 
    label: 'Pagas', 
    href: '/dashboard/commissions/paid',
    icon: CheckCircle,
    description: 'Histórico'
  },
];

export default function CommissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gestão de comissões e pagamentos
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
