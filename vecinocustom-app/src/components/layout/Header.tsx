'use client';

import { Search, Bell, Plus, Menu } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Mobile Menu + Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-black flex items-center justify-center font-bold text-white text-xs">
            V
          </div>
          <span className="text-sm font-semibold text-gray-900">VecinoCustom</span>
        </Link>
      </div>

      {/* Search - Hidden on mobile */}
      <div className="hidden md:flex flex-1 items-center max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3 sm:ml-6">
        <button className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white rounded-md text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors active:scale-95">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>

        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors active:scale-95">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-black"></span>
        </button>

        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

        <button className="flex items-center gap-2 px-1 sm:px-2 py-1 sm:py-1.5 hover:bg-gray-100 rounded-md transition-colors active:scale-95">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-black flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
            A
          </div>
        </button>
      </div>
    </header>
  );
}
