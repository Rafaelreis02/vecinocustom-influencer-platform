'use client';

import { useEffect, useState } from 'react';

interface SummaryData {
  summary: {
    totalSales: number;
    totalCommissions: number;
    roiPercentage: number;
    transactionCount: number;
  };
  topInfluencers: any[];
  topCoupons: any[];
  commissionsByStatus: {
    pending: number;
    approved: number;
    paid: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Datas fixas para testes
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        const response = await fetch(
          `/api/analytics/summary?startDate=${startDate}&endDate=${endDate}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const json = await response.json();
        setData(json);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 mb-6">
          <p className="font-semibold">Erro ao carregar dados</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600 mb-2">Total de Vendas</div>
              <div className="text-2xl font-bold text-green-600">
                €{data.summary.totalSales.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600 mb-2">Total de Comissões</div>
              <div className="text-2xl font-bold text-blue-600">
                €{data.summary.totalCommissions.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600 mb-2">ROI (%)</div>
              <div className="text-2xl font-bold text-purple-600">
                {data.summary.roiPercentage.toFixed(2)}%
              </div>
            </div>
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-600 mb-2">Transações</div>
              <div className="text-2xl font-bold text-orange-600">
                {data.summary.transactionCount}
              </div>
            </div>
          </div>

          {/* Commission Status */}
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
