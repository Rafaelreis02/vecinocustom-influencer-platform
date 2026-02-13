'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Loader2,
  Check,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPayments();
  }, []);

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

  async function loadPayments() {
    try {
      setLoading(true);
      const res = await fetch('/api/commissions?status=PROCESSING');
      
      if (!res.ok) throw new Error('Erro ao carregar pagamentos');
      
      const data = await res.json();
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
    if (!window.confirm('Tens a certeza que queres marcar estas comissões como pagas?')) {
      return;
    }

    try {
      setProcessingIds(prev => new Set(prev).add(influencerId));

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
      addToast(`Pagamento de ${formatCurrency(result.totalPaid)} registrado!`, 'success');
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

  const totalPending = paymentGroups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalCount = paymentGroups.reduce((sum, g) => sum + g.commissions.length, 0);
  const totalInfluencers = paymentGroups.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-800">
              <strong>Comissões Aprovadas:</strong> Aguardam pagamento aos influencers.
              Clica em "Marcar como Pago" após efetuares o pagamento.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-600">Total a Pagar</p>
            <p className="text-2xl font-bold text-indigo-900">{formatCurrency(totalPending)}</p>
          </div>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700">Total a Pagar</p>
          <p className="text-xl font-bold text-indigo-900">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700">Comissões</p>
          <p className="text-xl font-bold text-blue-900">{totalCount}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <p className="text-sm text-purple-700">Influencers</p>
          <p className="text-xl font-bold text-purple-900">{totalInfluencers}</p>
        </div>
      </div>

      {/* Lista Horizontal */}
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
        <div className="space-y-3">
          {paymentGroups.map((group) => {
            const isProcessing = processingIds.has(group.influencer.id);
            const isExpanded = expandedIds.has(group.influencer.id);
            
            return (
              <div 
                key={group.influencer.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Header - Sempre visível */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {group.influencer.avatarUrl ? (
                        <img src={group.influencer.avatarUrl} alt={group.influencer.name} className="h-full w-full object-cover" />
                      ) : (
                        group.influencer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.influencer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {group.commissions.length} comissões • Total: {formatCurrency(group.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(group.influencer.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="h-4 w-4" /> Ocultar</>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /> Ver</>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleMarkAsPaid(
                        group.influencer.id, 
                        group.commissions.map(c => c.id)
                      )}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> A processar...</>
                      ) : (
                        <><Check className="h-4 w-4" /> Pagar {formatCurrency(group.totalAmount)}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Detalhes - Collapsible */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Detalhes das comissões:</p>
                    <div className="space-y-2">
                      {group.commissions.map((commission) => (
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
                          <span className="font-semibold text-gray-900">{formatCurrency(commission.amount)}</span>
                        </div>
                      ))}
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
