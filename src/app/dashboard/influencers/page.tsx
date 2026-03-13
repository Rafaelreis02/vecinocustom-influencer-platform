'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Instagram,
  Mail,
  Loader2,
  Users,
  Star,
  Target,
  CheckCircle,
  ChevronRight,
  Send
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ImportInfluencerModal } from '@/components/ImportInfluencerModal';
import { PHASES, getStatusConfig } from '@/lib/influencer-status';

const TABS = [
  { 
    id: 'prospecting', 
    label: 'Prospeção', 
    icon: Search,
    description: 'Novos influencers',
    color: 'bg-indigo-100 text-indigo-700',
    activeColor: 'bg-[#0E1E37] text-white'
  },
  { 
    id: 'negotiating', 
    label: 'A Negociar', 
    icon: Target,
    description: 'Em discussão',
    color: 'bg-blue-100 text-blue-700',
    activeColor: 'bg-[#0E1E37] text-white'
  },
  { 
    id: 'closing', 
    label: 'Em Curso', 
    icon: CheckCircle,
    description: 'Campanhas ativas',
    color: 'bg-emerald-100 text-emerald-700',
    activeColor: 'bg-[#0E1E37] text-white'
  },
];

type Influencer = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  status: string;
  matchScore: number | null;
  fitScore: number | null;
  createdAt: string;
};

function InfluencersContent() {
  const [activeTab, setActiveTab] = useState('prospecting');
  const [searchQuery, setSearchQuery] = useState('');
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const [contactingId, setContactingId] = useState<string | null>(null);

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

  const handleContact = async (e: React.MouseEvent, influencer: Influencer) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!influencer.email) {
      addToast('Influencer não tem email definido', 'error');
      return;
    }

    try {
      setContactingId(influencer.id);
      const res = await fetch(`/api/influencers/${influencer.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar email');
      }

      setAllInfluencers(prev => prev.map(inf => 
        inf.id === influencer.id ? { ...inf, status: 'CONTACTED' } : inf
      ));
      
      addToast(`✅ Email enviado para ${influencer.name}`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Erro ao enviar email', 'error');
    } finally {
      setContactingId(null);
    }
  };

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
        (inf.instagramHandle && inf.instagramHandle.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-6">
      <ImportInfluencerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchInfluencers}
      />

      {/* ✅ Header Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Influencers</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestão de parcerias
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Novo Influencer
        </button>
      </div>

      {/* ✅ Tabs Minimalistas */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
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
            
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center gap-3 p-4 text-left transition-all ${
                  isActive ? 'bg-gray-50' : 'hover:bg-gray-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  isActive ? tab.activeColor : tab.color
                }`}>
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {tab.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-[#0E1E37] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Pesquisar influencers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border-0 bg-gray-50 py-4 pl-12 pr-4 text-[15px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#0E1E37]/20 transition-all"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" strokeWidth={1.5} />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredInfluencers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Nenhum influencer
              </h3>
              <p className="text-sm text-gray-400">
                Adiciona influencers para começar
              </p>
            </div>
          )}

          {/* Lista */}
          {!loading && filteredInfluencers.length > 0 && (
            <div className="space-y-3">
              {filteredInfluencers.map((influencer) => {
                const statusConfig = getStatusConfig(influencer.status);
                
                return (
                  <Link
                    key={influencer.id}
                    href={`/dashboard/influencers/${influencer.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-2xl bg-[#0E1E37] flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                      {influencer.avatarUrl ? (
                        <img src={influencer.avatarUrl} alt={influencer.name} className="h-full w-full object-cover" />
                      ) : (
                        influencer.name[0]
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{influencer.name}</h3>
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400 mt-0.5">
                        {influencer.instagramHandle && (
                          <span className="flex items-center gap-1">
                            <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {influencer.instagramHandle}
                          </span>
                        )}
                        {influencer.email && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {influencer.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    {influencer.matchScore && (
                      <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white rounded-full shadow-sm">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium">{influencer.matchScore}</span>
                      </div>
                    )}

                    {/* Status */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                      {statusConfig.label}
                    </div>

                    {/* Contact Button */}
                    {influencer.status === 'SUGGESTION' && (
                      <button
                        onClick={(e) => handleContact(e, influencer)}
                        disabled={contactingId === influencer.id}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0E1E37] text-white text-xs font-medium rounded-full hover:bg-[#1a2f4f] transition-colors disabled:opacity-50"
                      >
                        {contactingId === influencer.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        <span className="hidden sm:inline">Contactar (enviar email)</span>
                      </button>
                    )}

                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InfluencersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" strokeWidth={1.5} />
      </div>
    }>
      <InfluencersContent />
    </Suspense>
  );
}
