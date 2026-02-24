'use client';

import { useState } from 'react';
import { X, Plus, Loader2, Search, Globe, User } from 'lucide-react';
import { ImportHandleTab } from './ImportHandleTab';
import { DiscoverByLanguageTab } from './DiscoverByLanguageTab';

interface ImportInfluencerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportInfluencerModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportInfluencerModalProps) {
  const [activeTab, setActiveTab] = useState<'handle' | 'discover'>('handle');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Novo Influencer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('handle')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'handle'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Search className="h-4 w-4" />
            Importar Handle
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'discover'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Globe className="h-4 w-4" />
            Descobrir por Seed
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'handle' ? (
            <ImportHandleTab onSuccess={onSuccess} onClose={onClose} />
          ) : (
            <DiscoverByLanguageTab onSuccess={onSuccess} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
