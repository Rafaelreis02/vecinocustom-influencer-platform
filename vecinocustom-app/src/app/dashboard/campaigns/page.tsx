'use client';

import { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

// Mock data
const campaigns = [
  {
    id: '1',
    name: 'Valentine\'s Day 2026',
    description: 'Coleção especial Dia dos Namorados',
    status: 'active',
    startDate: '2026-01-15',
    endDate: '2026-02-14',
    budget: 5000,
    spent: 3200,
    influencers: 5,
    videos: 8,
    totalViews: 1200000,
    totalRevenue: 8500,
    coupons: 5,
  },
  {
    id: '2',
    name: 'Spring Collection',
    description: 'Lançamento coleção Primavera',
    status: 'draft',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    budget: 8000,
    spent: 0,
    influencers: 0,
    videos: 0,
    totalViews: 0,
    totalRevenue: 0,
    coupons: 0,
  },
  {
    id: '3',
    name: 'Christmas 2025',
    description: 'Campanha de Natal',
    status: 'completed',
    startDate: '2025-11-15',
    endDate: '2025-12-25',
    budget: 6000,
    spent: 5800,
    influencers: 7,
    videos: 12,
    totalViews: 2100000,
    totalRevenue: 15200,
    coupons: 8,
  },
  {
    id: '4',
    name: 'Mother\'s Day Special',
    description: 'Presentes personalizados para mães',
    status: 'paused',
    startDate: '2026-04-15',
    endDate: '2026-05-10',
    budget: 4000,
    spent: 1200,
    influencers: 3,
    videos: 4,
    totalViews: 350000,
    totalRevenue: 2100,
    coupons: 3,
  },
];

const statusConfig = {
  active: { label: 'Ativa', color: 'text-green-700 bg-green-50 border-green-200', icon: Play },
  draft: { label: 'Rascunho', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Clock },
  paused: { label: 'Pausada', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Pause },
  completed: { label: 'Concluída', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle },
};

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCampaigns = campaigns.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
  };

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
            <p className="text-sm text-gray-600">Revenue</p>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900">€{stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
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
        </select>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:border-gray-900 transition-colors">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => {
          const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig];
          const StatusIcon = statusInfo.icon;
          const budgetPercent = (campaign.spent / campaign.budget) * 100;
          
          return (
            <div
              key={campaign.id}
              className="rounded-lg bg-white p-6 border border-gray-200 hover:border-gray-900 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(campaign.startDate).toLocaleDateString('pt')} - {new Date(campaign.endDate).toLocaleDateString('pt')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {campaign.influencers} influencers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {(campaign.totalViews / 1000).toFixed(0)}K views
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                {/* Budget Progress */}
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

                {/* Revenue */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Revenue</p>
                  <p className="text-xl font-semibold text-gray-900">€{campaign.totalRevenue.toLocaleString()}</p>
                </div>

                {/* ROI */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">ROI</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {campaign.spent > 0 ? `${((campaign.totalRevenue / campaign.spent - 1) * 100).toFixed(0)}%` : '-'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <div className="text-center py-16 rounded-lg bg-white border border-gray-200">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-500 mb-6">
            Começa por criar a tua primeira campanha
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Link>
        </div>
      )}
    </div>
  );
}
