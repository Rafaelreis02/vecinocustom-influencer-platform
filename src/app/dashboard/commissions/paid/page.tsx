'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Loader2,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Influencer {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
}

interface PaymentBatch {
  id: string;
  totalAmount: number;
  currency: string;
  paidAt: string;
  method: string;
  reference: string | null;
  influencer: Influencer;
}

export default function PaidCommissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <PaidCommissionsContent />
    </Suspense>
  );
}

function PaidCommissionsContent() {
  const { addToast } = useGlobalToast();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Filtros de data
  const [dateFilter, setDateFilter] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomFilter, setShowCustomFilter] = useState(false);

  useEffect(() => {
    loadPaidBatches();
  }, [dateFilter, customStartDate, customEndDate]);

  function toggleExpand(batchId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  }

  async function loadPaidBatches() {
    try {
      setLoading(true);
      
      let startDate: string | null = null;
      let endDate: string | null = null;
      
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate).toISOString();
      } else if (dateFilter !== 'custom') {
        const days = parseInt(dateFilter);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        startDate = start.toISOString();
        endDate = end.toISOString();
      }
      
      let url = '/api/commissions/batches';
      if (startDate && endDate) {
        url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      setBatches(data.batches || []);

    } catch (error) {
      console.error('Error loading paid batches:', error);
      addToast('Erro ao carregar histórico', 'error');
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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-PT');
  }

  const totalPaid = batches.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCount = batches.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['30', '60', '90'].map(days => (
              <button
                key={days}
                onClick={() => { setDateFilter(days); setShowCustomFilter(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  dateFilter === days 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos {days} dias
              </button>
            ))}
            <button
              onClick={() => { setDateFilter('custom'); setShowCustomFilter(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                dateFilter === 'custom' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personalizado
            </button>
          </div>
        </div>
        
        {showCustomFilter && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Data Inicial</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Data Final</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-sm text-green-700">Total Pago</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700">Nº de Pagamentos</p>
          <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
        </div>
      </div>

      {/* Lista Horizontal */}
      {batches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pagamento encontrado</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isExpanded = expandedIds.has(batch.id);
            
            return (
              <div 
                key={batch.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Linha Principal - Sempre visível */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {batch.influencer.avatarUrl ? (
                        <img 
                          src={batch.influencer.avatarUrl} 
                          alt={batch.influencer.name} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        batch.influencer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{batch.influencer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(batch.paidAt)}
                      </p>
                    </div>
                  </div>

                  {/* Valor + Toggle */}
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(batch.totalAmount)}
                    </span>
                    
                    <button
                      onClick={() => toggleExpand(batch.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="h-4 w-4" /></>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Detalhes - Collapsible */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Referência:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {batch.reference || '-'}
                        </span>
                      </div>
                      <div className="text-right">
                        <Link 
                          href={`/dashboard/influencers/${batch.influencer.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver perfil →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
