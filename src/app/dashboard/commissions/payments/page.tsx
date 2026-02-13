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

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);
      // Buscar comissões com status PROCESSING (aprovadas, aguardam pagamento)
      const res = await fetch('/api/commissions?status=PROCESSING');
      
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

  function PaymentMethodLabel({ method }: { method: string }) {
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
                          <PaymentMethodLabel method={group.influencer.paymentMethod || 'BANK_TRANSFER'} />
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
