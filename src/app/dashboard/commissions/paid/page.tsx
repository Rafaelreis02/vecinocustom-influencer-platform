'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
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

  useEffect(() => {
    loadPaidBatches();
  }, []);

  async function loadPaidBatches() {
    try {
      setLoading(true);
      // Buscar batches de pagamento (pagamentos agregados)
      const res = await fetch('/api/commissions/batches');
      
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
      case 'BANK_TRANSFER': return 'Transferência';
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

  const totalPaid = batches.reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-800">
              <strong>Histórico de Pagamentos:</strong> Registo de pagamentos realizados aos influencers.
            </p>
            <p className="text-xs text-green-600 mt-1">
              Cada card representa um pagamento efetuado numa data específica.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-600">Total Pago</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pagamento registado</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Ainda não foram efetuados pagamentos.
            Processa pagamentos na aba "Pagamentos" primeiro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <div 
              key={batch.id} 
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Avatar e Nome */}
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden">
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
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {batch.influencer.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <PaymentMethodIcon method={batch.method} />
                    <span>{PaymentMethodLabel(batch.method)}</span>
                  </div>
                </div>
              </div>

              {/* Data e Valor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data do Pagamento
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatDate(batch.paidAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Total Pago</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(batch.totalAmount)}
                  </span>
                </div>

                {batch.reference && (
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Referência</span>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                      {batch.reference}
                    </span>
                  </div>
                )}
              </div>

              {/* Link para perfil */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  href={`/dashboard/influencers/${batch.influencer.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver perfil do influencer →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
