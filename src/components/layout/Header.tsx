'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 min-w-0">
      {/* Mobile Menu + Logo */}
      <div className="flex items-center gap-3 md:hidden min-w-0 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors shrink-0"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded bg-black flex items-center justify-center font-bold text-white text-xs shrink-0">
            V
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate">VecinoCustom</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>
    </header>
  );
}
