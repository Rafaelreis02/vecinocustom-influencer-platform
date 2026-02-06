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
  status: string;
  totalViews: number;
  engagement: number;
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Influencers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gere influencers ativos, em negociação e sugestões da IA
          </p>
        </div>
        <Link
          href="/dashboard/influencers/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Influencer
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive 
                    ? 'border-black text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs font-medium
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
              className="rounded-lg bg-white p-5 border border-gray-200 hover:border-gray-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Left: Profile */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white font-semibold">
                    {influencer.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{influencer.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {influencer.instagramHandle && (
                        <span className="flex items-center gap-1">
                          <Instagram className="h-4 w-4" />
                          {influencer.instagramHandle}
                        </span>
                      )}
                      {influencer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {influencer.email}
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
                          {influencer.instagramFollowers ? (influencer.instagramFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-gray-900">{influencer.engagement}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Campanhas</p>
                        <p className="font-semibold text-gray-900">{influencer.campaigns}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Revenue</p>
                        <p className="font-semibold text-gray-900">€{influencer.totalRevenue}</p>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'negotiating' && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Followers</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.instagramFollowers ? (influencer.instagramFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-gray-900">{influencer.engagement}%</p>
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
                          {influencer.instagramFollowers ? (influencer.instagramFollowers / 1000).toFixed(1) + 'K' : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Engagement</p>
                        <p className="font-semibold text-gray-900">{influencer.engagement}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Match Score</p>
                        <p className="font-semibold text-gray-900">-</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {activeTab === 'suggestion' && (
                    <button className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
                      Contactar
                    </button>
                  )}
                  {activeTab === 'negotiating' && (
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      Mensagem
                    </button>
                  )}
                  <Link
                    href={`/dashboard/influencers/${influencer.id}`}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/influencers/${influencer.id}/edit`}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(influencer.id, influencer.name)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
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
