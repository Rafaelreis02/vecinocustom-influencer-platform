'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  Plus,
  Search,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  influencersCount: number;
  videosCount: number;
  totalViews: number;
  spent: number;
}

const statusConfig = {
  ACTIVE: { 
    label: 'Ativa', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dotColor: 'bg-emerald-500'
  },
  DRAFT: { 
    label: 'Rascunho', 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dotColor: 'bg-gray-400'
  },
  PAUSED: { 
    label: 'Pausada', 
    color: 'bg-amber-50 text-amber-700 border-amber-100',
    dotColor: 'bg-amber-500'
  },
  COMPLETED: { 
    label: 'Concluída', 
    color: 'bg-blue-50 text-blue-700 border-blue-100',
    dotColor: 'bg-blue-500'
  },
  CANCELLED: { 
    label: 'Cancelada', 
    color: 'bg-red-50 text-red-700 border-red-100',
    dotColor: 'bg-red-500'
  },
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { addToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Campanha',
      message: `Tens a certeza que queres eliminar "${name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast(`${name} eliminada`, 'success');
        setCampaigns(campaigns.filter(c => c.id !== id));
      }
    } catch (error) {
      addToast('Erro ao eliminar', 'error');
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter.toUpperCase();
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Header Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Campanhas</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestão de campanhas
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nova Campanha
        </Link>
      </div>

      {/* ✅ Filtros Minimalistas */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Pesquisar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-4 text-[15px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0E1E37]/20 transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border-0 bg-white px-6 py-4 text-[15px] text-gray-700 focus:ring-2 focus:ring-[#0E1E37]/20 transition-all shadow-sm cursor-pointer appearance-none"
          style={{ backgroundImage: 'none' }}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="draft">Rascunhos</option>
          <option value="paused">Pausadas</option>
          <option value="completed">Concluídas</option>
        </select>
      </div>

      {/* ✅ Lista de Campanhas */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => {
          const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.DRAFT;
          const budgetPercent = campaign.budget ? (campaign.spent / campaign.budget) * 100 : 0;
          
          return (
            <div
              key={campaign.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {campaign.name}
                    </h3>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                      {statusInfo.label}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-400 mb-3">{campaign.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    {campaign.startDate && campaign.endDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" strokeWidth={1.5} />
                        {new Date(campaign.startDate).toLocaleDateString('pt')} - {new Date(campaign.endDate).toLocaleDateString('pt')}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" strokeWidth={1.5} />
                      {campaign.influencersCount} influencers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                      {(campaign.totalViews / 1000).toFixed(0)}K views
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.name)}
                    className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                {/* Budget */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Budget</p>
                  {campaign.budget ? (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-semibold text-gray-900">€{campaign.spent.toLocaleString()}</span>
                        <span className="text-gray-400">/ €{campaign.budget.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0E1E37] rounded-full transition-all"
                          style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sem budget</p>
                  )}
                </div>

                {/* Views */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Views</p>
                  <p className="text-xl font-semibold text-gray-900">{campaign.totalViews.toLocaleString()}</p>
                </div>

                {/* Gasto */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Gasto</p>
                  <p className="text-xl font-semibold text-gray-900">€{campaign.spent.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Empty State */}
      {filteredCampaigns.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Target className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {campaigns.length === 0 ? 'Nenhuma campanha' : 'Nenhuma campanha encontrada'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {campaigns.length === 0 ? 'Cria a tua primeira campanha' : 'Ajusta os filtros'}
          </p>
          {campaigns.length === 0 && (
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nova Campanha
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
