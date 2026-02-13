'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingBag,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Stats {
  total: number;
  pending: number;
  processing: number;
  paid: number;
  totalOrders: number;
  totalInfluencers: number;
}

export default function CommissionsOverviewPage() {
  const { addToast } = useGlobalToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // default: 30 dias

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  async function loadStats() {
    try {
      setLoading(true);
      
      // Calcular datas
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - parseInt(dateRange));

      const res = await fetch(`/api/commissions/overview?start=${start.toISOString()}&end=${end.toISOString()}`);
      
      if (!res.ok) throw new Error('Erro ao carregar estatísticas');
      
      const data = await res.json();
      setStats(data);

    } catch (error) {
      console.error('Error loading stats:', error);
      addToast('Erro ao carregar estatísticas', 'error');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total em Comissões',
      value: formatCurrency(stats.total),
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-600',
      description: 'Valor total gerado',
    },
    {
      title: 'Pendentes',
      value: formatCurrency(stats.pending),
      icon: TrendingUp,
      color: 'bg-yellow-100 text-yellow-600',
      description: `${((stats.pending / stats.total) * 100).toFixed(1)}% do total`,
    },
    {
      title: 'Aprovadas (Aguardam Pagamento)',
      value: formatCurrency(stats.processing),
      icon: ShoppingBag,
      color: 'bg-indigo-100 text-indigo-600',
      description: 'Prontas para pagar',
    },
    {
      title: 'Já Pagas',
      value: formatCurrency(stats.paid),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      description: 'Pagamentos realizados',
    },
    {
      title: 'Total de Encomendas',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-purple-100 text-purple-600',
      description: 'Encomendas com comissão',
    },
    {
      title: 'Influencers Ativos',
      value: stats.totalInfluencers,
      icon: Users,
      color: 'bg-pink-100 text-pink-600',
      description: 'Com comissões geradas',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de Data */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">Período:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Como funciona?</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Pendentes:</strong> Comissões que precisam de aprovação (encomenda por encomenda)</li>
          <li>• <strong>Aprovadas:</strong> Comissões validadas, aguardam pagamento ao influencer</li>
          <li>• <strong>Pagas:</strong> Pagamentos já realizados aos influencers</li>
        </ul>
      </div>
    </div>
  );
}
