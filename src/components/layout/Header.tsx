'use client';

import { Menu, Bell } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 sm:px-6 lg:px-8 min-w-0 sticky top-0 z-30">
      {/* Mobile Menu + Logo */}
      <div className="flex items-center gap-3 md:hidden min-w-0 flex-1">
        <button 
          onClick={onMenuClick}
          className="w-10 h-10 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
        >
          <Menu className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-[#0E1E37] flex items-center justify-center font-bold text-white text-sm">
            V
          </div>
          <span className="text-base font-semibold text-gray-900 truncate">VecinoCustom</span>
        </Link>
      </div>

      {/* Desktop - Breadcrumb area */}
      <div className="hidden md:flex items-center gap-4 flex-1">
        <span className="text-sm text-gray-400">Bem-vindo de volta</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center relative">
          <Bell className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#0E1E37] flex items-center justify-center text-white text-sm font-medium">
          A
        </div>
      </div>
    </header>
  );
}
