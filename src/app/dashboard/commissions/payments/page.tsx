'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  AlertCircle,
  Filter,
  Calendar,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

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
  orderNumber: string | null;
  orderDate: string | null;
  couponCode: string | null;
}

interface PaymentGroup {
  influencer: Influencer;
  totalAmount: number;
  commissions: Commission[];
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  );
}

function PaymentsContent() {
  const { addToast } = useGlobalToast();
  const [paymentGroups, setPaymentGroups] = useState<PaymentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filtros de data
  const [dateFilter, setDateFilter] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomFilter, setShowCustomFilter] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [dateFilter, customStartDate, customEndDate]);

  async function loadPayments() {
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
      
      let url = '/api/commissions?status=PROCESSING';
      if (startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Erro ao carregar pagamentos');
      
      const data = await res.json();
      
      // Agrupar por influencer
      const groups = data.influencerSummaries || [];
      setPaymentGroups(groups);

    } catch (error) {
      console.error('Error loading payments:', error);
      addToast('Erro ao carregar pagamentos', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsPaid(influencerId: string, commissionIds: string[]) {
    if (!window.confirm('Tens a certeza que queres marcar estas comissões como pagas?\n\nEsta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setProcessingIds(prev => new Set(prev).add(influencerId));

      // Marcar todas as comissões do influencer como PAID
      const res = await fetch('/api/commissions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          influencerId,
          commissionIds 
        }),
      });

      if (!res.ok) throw new Error('Erro ao processar pagamento');

      const result = await res.json();
      
      addToast(`Pagamento de ${formatCurrency(result.totalPaid)} registrado com sucesso!`, 'success');
      
      // Recarregar
      await loadPayments();

    } catch (error) {
      console.error('Error marking as paid:', error);
      addToast('Erro ao processar pagamento', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(influencerId);
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

  function PaymentMethodIcon({ method }: { method: string }) {
    switch (method) {
      case 'BANK_TRANSFER': return <Banknote className="h-4 w-4" />;
      case 'PAYPAL': return <CreditCard className="h-4 w-4" />;
      case 'MBWAY': return <Smartphone className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  }

  function PaymentMethodLabel(method: string) {
    switch (method) {
      case 'BANK_TRANSFER': return 'Transferência Bancária';
      case 'PAYPAL': return 'PayPal';
      case 'MBWAY': return 'MBWay';
      default: return 'Transferência';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalPending = paymentGroups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalCount = paymentGroups.reduce((sum, g) => sum + g.commissions.length, 0);
  const totalInfluencers = paymentGroups.length;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-800">
              <strong>Comissões Aprovadas:</strong> Aguardam pagamento aos influencers.
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              Quando pagares ao influencer, clica em "Marcar como Pago" para registar.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-600">Total a Pagar</p>
            <p className="text-2xl font-bold text-indigo-900">{formatCurrency(totalPending)}</p>
          </div>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-indigo-700">Total a Pagar</p>
              <p className="text-2xl font-bold text-indigo-900">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Nº de Comissões</p>
              <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Filter className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">Influencers</p>
              <p className="text-2xl font-bold text-purple-900">{totalInfluencers}</p>
            </div>
          </div>
        </div>
      </div>

      {paymentGroups.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Check className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pagamento pendente</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Não existem comissões aprovadas aguardando pagamento.
            Aprova comissões na aba "Pendentes" primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentGroups.map((group) => {
            const isProcessing = processingIds.has(group.influencer.id);
            
            return (
              <div 
                key={group.influencer.id} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Info do Influencer */}
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                        {group.influencer.avatarUrl ? (
                          <img src={group.influencer.avatarUrl} alt={group.influencer.name} className="h-full w-full object-cover" />
                        ) : (
                          group.influencer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.influencer.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <PaymentMethodIcon method={group.influencer.paymentMethod || 'BANK_TRANSFER'} />
                          <span>{PaymentMethodLabel(group.influencer.paymentMethod || 'BANK_TRANSFER')}</span>
                          <span>•</span>
                          <span>{group.commissions.length} comissões</span>
                        </div>
                        {group.influencer.email && (
                          <p className="text-xs text-gray-400 mt-0.5">{group.influencer.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Valor e Botão */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total a Pagar</p>
                        <p className="text-xl font-bold text-indigo-600">{formatCurrency(group.totalAmount)}</p>
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(
                          group.influencer.id, 
                          group.commissions.map(c => c.id)
                        )}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            A processar...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Marcar como Pago
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Lista de Comissões */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="pb-2">Encomenda</th>
                          <th className="pb-2">Data</th>
                          <th className="pb-2 text-right">Comissão</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {group.commissions.map((commission) => (
                          <tr key={commission.id} className="border-t border-gray-50">
                            <td className="py-2 text-gray-900">
                              {commission.orderNumber || 'N/A'}
                              {commission.couponCode && (
                                <span className="block text-xs text-gray-400">{commission.couponCode}</span>
                              )}
                            </td>
                            <td className="py-2 text-gray-600">
                              {commission.orderDate ? formatDate(commission.orderDate) : '-'}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              {formatCurrency(commission.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
