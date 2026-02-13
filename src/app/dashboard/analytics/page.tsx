'use client';

import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        console.log('Fetching analytics:', { startDate, endDate });
        
        const response = await fetch(
          `/api/analytics/summary?startDate=${startDate}&endDate=${endDate}`
        );

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const json = await response.json();
        console.log('Data received:', json);
        setData(json);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err?.message || 'Unknown error');
        // Set default empty data so page still renders
        setData({
          summary: {
            totalSales: 0,
            totalCommissions: 0,
            roiPercentage: 0,
            transactionCount: 0,
          },
          commissionsByStatus: {
            pending: 0,
            approved: 0,
            paid: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Always render something
  const displayData = data || {
    summary: {
      totalSales: 0,
      totalCommissions: 0,
      roiPercentage: 0,
      transactionCount: 0,
    },
    commissionsByStatus: {
      pending: 0,
      approved: 0,
      paid: 0,
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800 mb-6">
          <p className="text-sm">
            Nota: {error} (a mostrar dados vazios)
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-2">Total de Vendas</div>
          <div className="text-2xl font-bold text-green-600">
            €{displayData.summary?.totalSales?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-2">Total de Comissões</div>
          <div className="text-2xl font-bold text-blue-600">
            €{displayData.summary?.totalCommissions?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-2">ROI (%)</div>
          <div className="text-2xl font-bold text-purple-600">
            {displayData.summary?.roiPercentage?.toFixed(2) || '0.00'}%
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600 mb-2">Transações</div>
          <div className="text-2xl font-bold text-orange-600">
            {displayData.summary?.transactionCount || 0}
          </div>
        </div>
      </div>

      {/* Commission Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Comissões Pendentes</div>
          <div className="text-2xl font-bold text-orange-600 mt-2">
            €{displayData.commissionsByStatus?.pending?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Comissões Aprovadas</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            €{displayData.commissionsByStatus?.approved?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Comissões Pagas</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            €{displayData.commissionsByStatus?.paid?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {!loading && !error && (
        <p className="text-gray-500 text-sm mt-6">
          Dados do período: últimos 30 dias
        </p>
      )}
    </div>
  );
}
