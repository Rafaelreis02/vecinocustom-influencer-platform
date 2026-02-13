'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Filter,
  DollarSign,
  Loader2,
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

interface Commission {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FAILED';
  paidAt: string | null;
  method: string;
  reference: string | null;
  createdAt: string;
  influencer: Influencer;
  orderNumber: string | null;
  orderDate: string | null;
  customerEmail: string | null;
  baseAmount: number | null;
  commissionRate: number | null;
  couponCode: string | null;
}

interface InfluencerSummary {
  influencer: Influencer;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  count: number;
  commissions: Commission[];
}

export default function PendingCommissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <PendingCommissionsContent />
    </Suspense>
  );
}

function PendingCommissionsContent() {
  const { addToast } = useGlobalToast();
  const [influencerSummaries, setInfluencerSummaries] = useState<InfluencerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filtros de data
  const [dateFilter, setDateFilter] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomFilter, setShowCustomFilter] = useState(false);

  useEffect(() => {
    loadCommissions();
  }, [dateFilter, customStartDate, customEndDate]);

  function toggleExpand(influencerId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(influencerId)) {
        next.delete(influencerId);
      } else {
        next.add(influencerId);
      }
      return next;
    });
  }

  async function loadCommissions() {
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
      
      let url = '/api/commissions?status=PENDING';
      if (startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Erro ao carregar comissões');
      
      const data = await res.json();
      setInfluencerSummaries(data.influencerSummaries || []);

    } catch (error) {
      console.error('Error loading commissions:', error);
      addToast('Erro ao carregar comissões', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(commissionId: string) {
    try {
      setProcessingIds(prev => new Set(prev).add(commissionId));

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      });

      if (!res.ok) throw new Error('Erro ao aprovar comissão');

      addToast('Comissão aprovada - vai para Pagamentos', 'success');
      await loadCommissions();

    } catch (error) {
      console.error('Error approving commission:', error);
      addToast('Erro ao aprovar comissão', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(commissionId);
        return next;
      });
    }
  }

  async function handleReject(commissionId: string) {
    if (!window.confirm('Tens a certeza que queres rejeitar esta comissão?')) return;

    try {
      setProcessingIds(prev => new Set(prev).add(commissionId));

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (!res.ok) throw new Error('Erro ao rejeitar comissão');

      addToast('Comissão rejeitada', 'success');
      await loadCommissions();

    } catch (error) {
      console.error('Error rejecting commission:', error);
      addToast('Erro ao rejeitar comissão', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(commissionId);
        return next;
      });
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

  const totalPending = influencerSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCount = influencerSummaries.reduce((sum, s) => sum + s.count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Comissões Pendentes:</strong> Aprova ou rejeita comissões. 
          As aprovadas vão para a aba "Pagamentos".
        </p>
      </div>

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
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
          <p className="text-sm text-yellow-700">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-900">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700">Nº de Comissões</p>
          <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
        </div>
      </div>

      {/* Lista Horizontal */}
      {influencerSummaries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhuma comissão pendente</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {influencerSummaries.map((summary) => {
            const isExpanded = expandedIds.has(summary.influencer.id);
            
            return (
              <div 
                key={summary.influencer.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {summary.influencer.avatarUrl ? (
                        <img src={summary.influencer.avatarUrl} alt={summary.influencer.name} className="h-full w-full object-cover" />
                      ) : (
                        summary.influencer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{summary.influencer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {summary.count} comissões • Total: {formatCurrency(summary.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(summary.influencer.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-4 w-4" /> Ocultar</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Gerir</>
                    )}
                  </button>
                </div>

                {/* Detalhes - Collapsible */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Comissões para aprovar:</p>
                    <div className="space-y-2">
                      {summary.commissions.map((commission) => {
                        const isProcessing = processingIds.has(commission.id);
                        
                        return (
                          <div 
                            key={commission.id}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-100"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {commission.orderNumber || 'Encomenda #' + commission.id.slice(-6)}
                                </p>
                                {commission.couponCode && (
                                  <p className="text-xs text-gray-500">Cupom: {commission.couponCode}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">{formatCurrency(commission.amount)}</span>
                              
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApprove(commission.id)}
                                  disabled={isProcessing}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                  title="Aprovar"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(commission.id)}
                                  disabled={isProcessing}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Rejeitar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
