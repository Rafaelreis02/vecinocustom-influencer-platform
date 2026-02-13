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
  paidAt: string;
  orderNumber: string | null;
  orderDate: string | null;
  couponCode: string | null;
}

interface PaidGroup {
  influencer: Influencer;
  totalPaid: number;
  commissions: Commission[];
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
  const [paidGroups, setPaidGroups] = useState<PaidGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaidCommissions();
  }, []);

  async function loadPaidCommissions() {
    try {
      setLoading(true);
      const res = await fetch('/api/commissions?status=PAID');
      
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      
      // Agrupar por influencer
      const groups = data.influencerSummaries || [];
      setPaidGroups(groups);

    } catch (error) {
      console.error('Error loading paid commissions:', error);
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

  const totalPaid = paidGroups.reduce((sum, g) => sum + g.totalPaid, 0);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-800">
              <strong>Histórico de Pagamentos:</strong> Comissões já pagas aos influencers.
            </p>
            <p className="text-xs text-green-600 mt-1">
              Estes valores já foram pagos e registados.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-600">Total Pago</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </div>

      {paidGroups.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pagamento registado</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Ainda não foram registados pagamentos.
            Processa pagamentos na aba "Pagamentos" primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paidGroups.map((group) => (
            <div 
              key={group.influencer.id} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Info do Influencer */}
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
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
                        <span>{group.commissions.length} pagamentos</span>
                      </div>
                      <Link 
                        href={`/dashboard/influencers/${group.influencer.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-0.5 inline-block"
                      >
                        Ver perfil →
                      </Link>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Pago</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(group.totalPaid)}</p>
                  </div>
                </div>

                {/* Lista de Pagamentos */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="pb-2">Encomenda</th>
                        <th className="pb-2">Data Pagamento</th>
                        <th className="pb-2 text-right">Valor</th>
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
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              {formatDate(commission.paidAt)}
                            </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
