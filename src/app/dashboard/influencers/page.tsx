'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Instagram,
  Mail,
  Edit,
  Trash2,
  Loader2,
  Users,
  Star,
  Target,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog';
import { PHASES, getStatusConfig } from '@/lib/influencer-status';

const TABS = [
  { 
    id: 'prospecting', 
    label: 'Prospeção', 
    icon: Search,
    description: 'Novos influencers para analisar',
    color: 'bg-indigo-100 text-indigo-700',
    activeColor: 'bg-indigo-600 text-white'
  },
  { 
    id: 'negotiating', 
    label: 'A Negociar', 
    icon: Target,
    description: 'Em discussão de propostas',
    color: 'bg-blue-100 text-blue-700',
    activeColor: 'bg-blue-600 text-white'
  },
  { 
    id: 'closing', 
    label: 'Em Curso', 
    icon: CheckCircle,
    description: 'Campanhas ativas',
    color: 'bg-emerald-100 text-emerald-700',
    activeColor: 'bg-emerald-600 text-white'
  },
];

type Influencer = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  instagramFollowers: number | null;
  tiktokHandle: string | null;
  tiktokFollowers: number | null;
  status: string;
  totalViews: number;
  totalFollowers: number;
  engagement: number;
  matchScore: number | null;
  campaigns: number;
  totalRevenue: number;
  activeCoupons: number;
};

function InfluencersContent() {
  const [activeTab, setActiveTab] = useState('prospecting');
  const [searchQuery, setSearchQuery] = useState('');
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();
  const { dialog, confirm: showConfirm } = useConfirm();

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/influencers`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const responseData = await res.json();
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setAllInfluencers(data);
    } catch (error) {
      console.error('Error fetching influencers:', error);
      addToast('Erro ao carregar influencers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Apagar Influencer',
      message: `Tens a certeza que queres apagar ${name}? Esta ação não pode ser desfeita.`,
      confirmText: 'Apagar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/influencers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      setAllInfluencers(prev => prev.filter(inf => inf.id !== id));
      addToast('Influencer apagado com sucesso', 'success');
    } catch (error) {
      addToast('Erro ao apagar influencer', 'error');
    }
  };

  // Filtrar por tab (fase) e pesquisa
  const currentPhase = TABS.find(t => t.id === activeTab);
  const phaseStatuses = activeTab === 'prospecting' 
    ? PHASES.PROSPECTING.statuses 
    : activeTab === 'negotiating' 
    ? PHASES.NEGOTIATING.statuses 
    : PHASES.CLOSING.statuses;

  const filteredInfluencers = allInfluencers
    .filter((inf: Influencer) => {
      const infStatus = (inf.status || 'UNKNOWN').toUpperCase();
      return phaseStatuses.map(s => s.toUpperCase()).includes(infStatus);
    })
    .filter((inf: Influencer) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        inf.name.toLowerCase().includes(q) ||
        (inf.email && inf.email.toLowerCase().includes(q)) ||
        (inf.instagramHandle && inf.instagramHandle.toLowerCase().includes(q)) ||
        (inf.tiktokHandle && inf.tiktokHandle.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        isDangerous={dialog.isDangerous}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestão de parcerias e campanhas
          </p>
        </div>
        <Link
          href="/dashboard/influencers/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Influencer
        </Link>
      </div>

      {/* Tabs de Fases */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = allInfluencers.filter((inf: Influencer) => {
              const statuses = tab.id === 'prospecting' 
                ? PHASES.PROSPECTING.statuses 
                : tab.id === 'negotiating' 
                ? PHASES.NEGOTIATING.statuses 
                : PHASES.CLOSING.statuses;
              return statuses.map(s => s.toUpperCase()).includes((inf.status || 'UNKNOWN').toUpperCase());
            }).length;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center gap-3 p-4 text-left transition-all hover:bg-gray-50 ${
                  activeTab === tab.id 
                    ? 'bg-gray-50 border-b-2 border-black' 
                    : 'border-b-2 border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  activeTab === tab.id ? tab.activeColor : tab.color
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      activeTab === tab.id ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {tab.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {tab.description}
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                  activeTab === tab.id ? 'rotate-90' : ''
                }`} />
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Tab Ativa */}
        <div className="p-4 sm:p-6">
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Pesquisar em ${currentPhase?.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredInfluencers.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Nenhum influencer em {currentPhase?.label}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                {searchQuery 
                  ? 'Nenhum resultado para a pesquisa.' 
                  : `Adiciona influencers para começares a gerir esta fase.`}
              </p>
            </div>
          )}

          {/* Lista de Influencers */}
          {!loading && filteredInfluencers.length > 0 && (
            <div className="space-y-3">
              {filteredInfluencers.map((influencer) => (
                <Link
                  key={influencer.id}
                  href={`/dashboard/influencers/${influencer.id}`}
                  className="rounded-lg bg-white p-3 sm:p-5 border border-gray-200 hover:border-gray-900 transition-colors block"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Profile */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm sm:text-base shrink-0 overflow-hidden">
                        {influencer.avatarUrl ? (
                          <img src={influencer.avatarUrl} alt={influencer.name} className="h-full w-full object-cover" />
                        ) : (
                          influencer.name[0]
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base truncate">{influencer.name}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          {influencer.instagramHandle && (
                            <span className="flex items-center gap-1 min-w-0">
                              <Instagram className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{influencer.instagramHandle}</span>
                            </span>
                          )}
                          {influencer.email && (
                            <span className="flex items-center gap-1 min-w-0">
                              <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{influencer.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats + Actions */}
                    <div className="flex items-center gap-4">
                      {/* Match Score */}
                      {influencer.matchScore && (
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{influencer.matchScore}</span>
                        </div>
                      )}

                      {/* Status */}
                      {(() => {
                        const statusConfig = getStatusConfig(influencer.status);
                        return (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${statusConfig.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                            <span className="hidden sm:inline">{statusConfig.label}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function InfluencersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <InfluencersContent />
    </Suspense>
  );
}
