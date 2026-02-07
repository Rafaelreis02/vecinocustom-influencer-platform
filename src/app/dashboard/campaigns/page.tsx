'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';

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
  ACTIVE: { label: 'Ativa', color: 'text-green-700 bg-green-50 border-green-200', icon: Play },
  DRAFT: { label: 'Rascunho', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Clock },
  PAUSED: { label: 'Pausada', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Pause },
  COMPLETED: { label: 'Concluída', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-red-700 bg-red-50 border-red-200', icon: Trash2 },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    if (!confirm(`Tens a certeza que queres eliminar a campanha "${name}"?`)) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCampaigns(campaigns.filter(c => c.id !== id));
      } else {
        alert('Erro ao eliminar campanha');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Erro ao eliminar campanha');
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter.toUpperCase();
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Campanhas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gere e acompanha as tuas campanhas de influencers
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Total Campanhas</p>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Ativas</p>
            <Play className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.active}</p>
        </div>
        <div className="rounded-lg bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Budget Total</p>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900">€{stats.totalBudget.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-white p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Total Views</p>
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900">{campaigns.reduce((sum, c) => sum + (c.totalViews || 0), 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-900 focus:outline-none transition-colors"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativas</option>
          <option value="draft">Rascunhos</option>
          <option value="paused">Pausadas</option>
          <option value="completed">Concluídas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => {
          const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.DRAFT;
          const StatusIcon = statusInfo.icon;
          const budgetPercent = campaign.budget ? (campaign.spent / campaign.budget) * 100 : 0;
          
          return (
            <div
              key={campaign.id}
              className="rounded-lg bg-white p-4 sm:p-6 border border-gray-200 hover:border-gray-900 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                    >
                      {campaign.name}
                    </Link>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusInfo.color} flex-shrink-0`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
                    {campaign.startDate && campaign.endDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {new Date(campaign.startDate).toLocaleDateString('pt')} - {new Date(campaign.endDate).toLocaleDateString('pt')}
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {campaign.influencersCount} influencers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {(campaign.totalViews / 1000).toFixed(0)}K views
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.name)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                {/* Budget Progress */}
                {campaign.budget && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-medium text-gray-900">
                        €{campaign.spent.toLocaleString()} / €{campaign.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-900 rounded-full transition-all"
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Views */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Views</p>
                  <p className="text-xl font-semibold text-gray-900">{campaign.totalViews.toLocaleString()}</p>
                </div>

                {/* Gasto */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Gasto</p>
                  <p className="text-xl font-semibold text-gray-900">
                    €{campaign.spent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && !loading && (
        <div className="text-center py-16 rounded-lg bg-white border border-gray-200">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {campaigns.length === 0 ? 'Nenhuma campanha criada' : 'Nenhuma campanha encontrada'}
          </h3>
          <p className="text-gray-500 mb-6">
            {campaigns.length === 0 
              ? 'Começa por criar a tua primeira campanha' 
              : 'Tenta ajustar os filtros de pesquisa'}
          </p>
          {campaigns.length === 0 && (
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
