'use client';

import { useState, useEffect } from 'react';
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
  Star
} from 'lucide-react';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog';
import { PHASES, getStatusConfig, type PhaseId } from '@/lib/influencer-status';

type Influencer = {
  id: string;
  name: string;
  email: string | null;
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

interface PhasePageLayoutProps {
  phaseId: PhaseId;
}

export default function PhasePageLayout({ phaseId }: PhasePageLayoutProps) {
  const phase = PHASES[phaseId];
  // Garante que o status inicial está em maiúsculas
  const [activeTab, setActiveTab] = useState<string>(phase.statuses[0].toUpperCase());
  const [searchQuery, setSearchQuery] = useState('');
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();
  const { dialog, confirm: showConfirm } = useConfirm();

  useEffect(() => {
    fetchInfluencers();
  }, [phaseId]);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      // Simplificado ao máximo: Chamada direta sem parâmetros complexos
      const res = await fetch(`/api/influencers`, { cache: 'no-store' });
      
      if (!res.ok) throw new Error('Failed to fetch');
      const responseData = await res.json();
      
      // Suporte para resposta direta ou { data: [] }
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      
      // Filtro rigoroso pela fase
      const phaseStatuses = phase.statuses.map(s => s.toUpperCase());
      const phaseInfluencers = data.filter((inf: Influencer) => {
        const infStatus = (inf.status || 'UNKNOWN').toUpperCase();
        return phaseStatuses.includes(infStatus);
      });
      
      setAllInfluencers(phaseInfluencers);
      
      // Garante que o activeTab está sempre em maiúsculas
      if (activeTab) setActiveTab(activeTab.toUpperCase());
      
    } catch (error) {
      console.error('Error fetching influencers:', error);
      addToast('Erro ao carregar lista de influencers', 'error');
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
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast(`${name} foi eliminado com sucesso`, 'success');
        fetchInfluencers();
      } else {
        const data = await res.json();
        addToast(data.error || 'Erro ao apagar influencer', 'error');
      }
    } catch (error) {
      console.error('Error deleting influencer:', error);
      addToast('Erro ao apagar influencer', 'error');
    }
  };

  // Filter by active tab and search query
  const filteredInfluencers = allInfluencers.filter(inf => {
    // Comparação absoluta em maiúsculas
    if (inf.status?.toUpperCase() !== activeTab?.toUpperCase()) return false;
    
    // Filtro de pesquisa
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inf.name.toLowerCase().includes(query) ||
        inf.email?.toLowerCase().includes(query) ||
        inf.instagramHandle?.toLowerCase().includes(query) ||
        inf.tiktokHandle?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const tabs = phase.statuses.map(status => {
    const config = getStatusConfig(status);
    return {
      id: status.toUpperCase(),
      label: config.label,
      icon: config.icon,
      count: allInfluencers.filter(i => i.status?.toUpperCase() === status?.toUpperCase()).length,
    };
  });

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ConfirmDialog {...dialog} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <span>{phase.icon || <Users className="h-8 w-8" />}</span>
            <span>{phase.label}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">
            Influencers em fase de {phase.label.toLowerCase()}
          </p>
        </div>
        <Link
          href="/dashboard/influencers/new"
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-md text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Adicionar Influencer</span>
          <span className="xs:hidden">Adicionar</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex gap-3 sm:gap-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab.toUpperCase() === tab.id.toUpperCase();
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0
                  ${isActive 
                    ? 'border-black text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`
                  px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium shrink-0
                  ${isActive ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, handle, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredInfluencers.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum influencer nesta tab</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Não encontrámos influencers com o estado "{tabs.find(t => t.id === activeTab)?.label}" nesta fase.
          </p>
        </div>
      )}

      {/* Influencers List */}
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
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black flex items-center justify-center text-white font-semibold text-sm sm:text-base shrink-0">
                    {influencer.name[0]}
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

                {/* Center: Stats + Status */}
                <div className="hidden lg:flex items-center gap-8 px-8">
                  {/* Status Badge */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1 text-left">Status</p>
                    {(() => {
                      const statusConfig = getStatusConfig(influencer.status);
                      return (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${statusConfig.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                          {statusConfig.label}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Followers */}
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs text-gray-500 mb-1">Followers</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {influencer.totalFollowers > 1000 
                        ? `${(influencer.totalFollowers / 1000).toFixed(1)}k` 
                        : influencer.totalFollowers}
                    </p>
                  </div>

                  {/* Engagement */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-gray-500 mb-1">Eng.</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {influencer.engagement}%
                    </p>
                  </div>

                  {/* Match Score */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                      Fit <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    </p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {influencer.matchScore || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(influencer.id, influencer.name);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
