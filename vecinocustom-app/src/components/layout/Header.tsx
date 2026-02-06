'use client';

import { Search, Bell, Plus } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div className="flex flex-1 items-center max-w-xl">
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
      <div className="flex items-center gap-3 ml-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="h-4 w-4" />
          Novo
        </button>

        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-black"></span>
        </button>

        <div className="h-6 w-px bg-gray-200"></div>

        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold">
            A
          </div>
        </button>
      </div>
    </header>
  );
}
