'use client';

import { useEffect, useState } from 'react';
import { KPICards } from './components/KPICards';
import { TopInfluencersTable } from './components/TopInfluencersTable';
import { TopCouponsTable } from './components/TopCouponsTable';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDateRange = (d: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - d);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    return { startDate: startStr, endDate: endStr };
  };

  if (!mounted) return <div className="p-6">Carregando...</div>;

  const dateRange = getDateRange(days);
  const { data, loading, error } = useAnalyticsData(
    dateRange.startDate,
    dateRange.endDate
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-500 mt-1">Vendas, comissões e performance</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0 flex-wrap">
          <button 
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            onClick={() => setDays(7)}
          >
            <Calendar className="h-3 w-3 inline mr-1" /> 7 dias
          </button>
          <button 
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            onClick={() => setDays(30)}
          >
            <Calendar className="h-3 w-3 inline mr-1" /> 30 dias
          </button>
          <button 
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            onClick={() => setDays(90)}
          >
            <Calendar className="h-3 w-3 inline mr-1" /> 90 dias
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm">
          Erro ao carregar: {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-12 text-gray-500">
          Carregando dados...
        </div>
      )}

      {data && (
        <>
          <KPICards
            totalSales={data.summary.totalSales}
            totalCommissions={data.summary.totalCommissions}
            roiPercentage={data.summary.roiPercentage}
            transactionCount={data.summary.transactionCount}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopInfluencersTable influencers={data.topInfluencers} loading={loading} />
            <TopCouponsTable coupons={data.topCoupons} loading={loading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600">Comissões Pendentes</div>
              <div className="text-2xl font-bold text-orange-600 mt-2">
                €{data.commissionsByStatus.pending.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600">Comissões Aprovadas</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                €{data.commissionsByStatus.approved.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600">Comissões Pagas</div>
              <div className="text-2xl font-bold text-green-600 mt-2">
                €{data.commissionsByStatus.paid.toFixed(2)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
