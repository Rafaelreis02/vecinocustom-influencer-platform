'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchData = async (start: string, end: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching analytics:', { start, end });
      
      const response = await fetch(
        `/api/analytics/summary?startDate=${start}&endDate=${end}`
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

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Vendas, comissões e performance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickFilter(7)}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 transition"
            >
              7 dias
            </button>
            <button
              onClick={() => handleQuickFilter(30)}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 transition"
            >
              30 dias
            </button>
          </div>
          <div>
            <button
              onClick={() => handleQuickFilter(90)}
              className="w-full px-3 py-2 text-sm border rounded hover:bg-gray-50 transition"
            >
              90 dias
            </button>
          </div>
        </div>
      </div>

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
          Dados de {startDate} até {endDate}
        </p>
      )}
    </div>
  );
}
