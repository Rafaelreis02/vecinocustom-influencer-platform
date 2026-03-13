'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isFullPage = pathname === '/dashboard/messages';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Sidebar - Minimalista */}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header - Minimalista */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content - Mais espaçamento e padding suave */}
        <main className={`flex-1 overflow-x-hidden ${isFullPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
