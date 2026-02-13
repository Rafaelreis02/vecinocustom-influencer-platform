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
  ArrowLeft,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

// Interfaces
interface Influencer {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  paymentMethod: string | null;
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

// Componente principal com Suspense
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

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [influencerSummaries, setInfluencerSummaries] = useState<InfluencerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInfluencer, setExpandedInfluencer] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filtros de data
  const [dateFilter, setDateFilter] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomFilter, setShowCustomFilter] = useState(false);

  // Carregar comissões pendentes
  useEffect(() => {
    loadCommissions();
  }, [dateFilter, customStartDate, customEndDate]);

  async function loadCommissions() {
    try {
      setLoading(true);
      
      // Calcular datas
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
      setCommissions(data.commissions || []);
      setInfluencerSummaries(data.influencerSummaries || []);

    } catch (error) {
      console.error('Error loading commissions:', error);
      addToast('Erro ao carregar comissões', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Aprovar comissão (vai para APPROVED para pagamento)
  async function handleApprove(commissionId: string) {
    try {
      setProcessingIds(prev => new Set(prev).add(commissionId));

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }), // PROCESSING = aprovado, aguarda pagamento
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

  // Rejeitar comissão
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

  function toggleExpand(influencerId: string) {
    setExpandedInfluencer(expandedInfluencer === influencerId ? null : influencerId);
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

  function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      PROCESSING: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800' },
      PAID: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
      FAILED: { label: 'Falhou', className: 'bg-gray-100 text-gray-800' },
    };
    const config = configs[status] || configs.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  function PaymentMethodIcon({ method }: { method: string }) {
    switch (method) {
      case 'BANK_TRANSFER': return <Banknote className="h-4 w-4" />;
      case 'PAYPAL': return <CreditCard className="h-4 w-4" />;
      case 'MBWAY': return <Smartphone className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Calcular totais
  const totalPending = influencerSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCount = influencerSummaries.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Comissões Pendentes:</strong> Aprova ou rejeita comissões encomenda por encomenda. 
          As aprovadas vão para a aba "Pagamentos" para serem pagas ao influencer.
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
            <button
              onClick={() => { setDateFilter('30'); setShowCustomFilter(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                dateFilter === '30' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => { setDateFilter('60'); setShowCustomFilter(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                dateFilter === '60' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 60 dias
            </button>
            <button
              onClick={() => { setDateFilter('90'); setShowCustomFilter(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                dateFilter === '90' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 90 dias
            </button>
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
        
        {/* Filtro Custom */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-700">Total Pendente</p>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Nº de Comissões</p>
              <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {influencerSummaries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhuma comissão pendente</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Não existem comissões pendentes de aprovação.
          </p>
        </div>
      ) : (
        influencerSummaries.map((summary) => {
          const isExpanded = expandedInfluencer === summary.influencer.id;
          const influencerCommissions = summary.commissions || [];

          return (
            <div 
              key={summary.influencer.id} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggleExpand(summary.influencer.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                    {summary.influencer.avatarUrl ? (
                      <img src={summary.influencer.avatarUrl} alt={summary.influencer.name} className="h-full w-full object-cover" />
                    ) : (
                      summary.influencer.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{summary.influencer.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{summary.count} comissões pendentes</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <PaymentMethodIcon method={summary.influencer.paymentMethod || 'BANK_TRANSFER'} />
                        {summary.influencer.paymentMethod === 'MBWAY' ? 'MBWay' : 
                         summary.influencer.paymentMethod === 'PAYPAL' ? 'PayPal' : 'Transferência'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-yellow-600">Total Pendente</p>
                    <p className="font-bold text-yellow-700">{formatCurrency(summary.totalAmount)}</p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Detalhes */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Encomenda</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {influencerCommissions.map((commission) => (
                          <tr key={commission.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {commission.orderNumber || 'N/A'}
                              {commission.couponCode && (
                                <span className="block text-xs text-gray-500">{commission.couponCode}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {commission.orderDate ? formatDate(commission.orderDate) : formatDate(commission.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {commission.customerEmail || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(commission.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApprove(commission.id)}
                                  disabled={processingIds.has(commission.id)}
                                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
                                >
                                  {processingIds.has(commission.id) ? '...' : 'Aprovar'}
                                </button>
                                <button
                                  onClick={() => handleReject(commission.id)}
                                  disabled={processingIds.has(commission.id)}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
