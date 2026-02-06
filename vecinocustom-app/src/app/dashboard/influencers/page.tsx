'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  Instagram,
  Mail,
  Eye,
  Edit,
  Trash2,
  MessageCircle,
  Star,
  Clock,
  Check,
  Loader2
} from 'lucide-react';

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

export default function InfluencersPage() {
  const [activeTab, setActiveTab] = useState<'working' | 'negotiating' | 'suggestion'>('working');
  const [searchQuery, setSearchQuery] = useState('');
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      // Fetch ALL influencers at once (no status filter)
      const res = await fetch(`/api/influencers`);
      const data = await res.json();
      setAllInfluencers(data);
    } catch (error) {
      console.error('Error fetching influencers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tens a certeza que queres apagar ${name}?`)) return;

    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchInfluencers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao apagar influencer');
      }
    } catch (error) {
      console.error('Error deleting influencer:', error);
      alert('Erro ao apagar influencer');
    }
  };

  // Filter by active tab and search query
  const filteredInfluencers = allInfluencers.filter(inf => {
    // Filter by status/tab
    if (inf.status !== activeTab) return false;
    
    // Filter by search query
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

  const tabs = [
    { id: 'working', label: 'A Trabalhar', icon: Check, count: allInfluencers.filter(i => i.status === 'working').length },
    { id: 'negotiating', label: 'Em Negociação', icon: Clock, count: allInfluencers.filter(i => i.status === 'negotiating').length },
    { id: 'suggestion', label: 'Sugestões', icon: Star, count: allInfluencers.filter(i => i.status === 'suggestion').length },
    { id: 'IMPORT_PENDING', label: 'A Analisar', icon: Loader2, count: allInfluencers.filter(i => i.status === 'IMPORT_PENDING').length },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Influencers</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">
            Gere influencers ativos, em negociação e sugestões da IA
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
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0
                  ${isActive 
                    ? 'border-black text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="xs:hidden sm:hidden">
                  {tab.id === 'working' ? 'Trabalhar' : tab.id === 'negotiating' ? 'Negociar' : 'Sugestões'}
                </span>
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

      {/* Filters */}
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

      {/* Influencers List */}
      {!loading && (
        <div className="space-y-3">
          {filteredInfluencers.map((influencer) => (
            <div
              key={influencer.id}
              className="rounded-lg bg-white p-3 sm:p-5 border border-gray-200 hover:border-gray-900 transition-colors"
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

                {/* Center: Stats */}
                <div className="hidden lg:flex items-center gap-8 px-8">
                  {activeTab === 'working' && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Followers</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.totalFollowers > 0 ? (influencer.totalFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-purple-600">
                          {influencer.engagement > 0 ? influencer.engagement + 'x' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Campanhas</p>
                        <p className="font-semibold text-gray-900">{influencer.campaigns}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Revenue</p>
                        <p className="font-semibold text-green-600">€{influencer.totalRevenue}</p>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'negotiating' && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Followers</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.totalFollowers > 0 ? (influencer.totalFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-purple-600">
                          {influencer.engagement > 0 ? influencer.engagement + 'x' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <p className="text-sm font-medium text-yellow-600">Pendente</p>
                      </div>
                    </>
                  )}

                  {activeTab === 'suggestion' && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Followers</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.totalFollowers > 0 ? (influencer.totalFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-purple-600">
                          {influencer.engagement > 0 ? influencer.engagement + 'x' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Fit Score</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.matchScore ? (
                            <span className="flex items-center justify-center gap-1">
                              {influencer.matchScore}/5
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </span>
                          ) : '-'}
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === 'IMPORT_PENDING' && (
                    <div className="flex items-center gap-2 text-purple-600 font-medium animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A Recolher Dados...
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {activeTab === 'suggestion' && (
                    <button className="hidden sm:flex px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors active:scale-95">
                      Contactar
                    </button>
                  )}
                  {activeTab === 'negotiating' && (
                    <button className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors active:scale-95">
                      <MessageCircle className="h-4 w-4" />
                      Mensagem
                    </button>
                  )}
                  <Link
                    href={`/dashboard/influencers/${influencer.id}`}
                    className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors active:scale-95"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/influencers/${influencer.id}/edit`}
                    className="hidden sm:inline-flex p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors active:scale-95"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(influencer.id, influencer.name)}
                    className="hidden sm:inline-flex p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredInfluencers.length === 0 && (
        <div className="text-center py-16 rounded-lg bg-white border border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum influencer nesta categoria
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'working' && 'Adiciona influencers com quem já estás a trabalhar'}
            {activeTab === 'negotiating' && 'Move influencers em processo de negociação para aqui'}
            {activeTab === 'suggestion' && 'A IA vai sugerir influencers que combinam com a tua marca'}
            {activeTab === 'IMPORT_PENDING' && 'Os influencers em análise aparecerão aqui temporariamente'}
          </p>
          <Link
            href="/dashboard/influencers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Primeiro Influencer
          </Link>
        </div>
      )}
    </div>
  );
}
