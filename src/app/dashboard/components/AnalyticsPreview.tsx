'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  sales: number;
  commissions: number;
}

interface AnalyticsData {
  summary: {
    totalSales: number;
    totalCommissions: number;
    roiPercentage: number;
  };
  monthlyTrend: MonthlyData[];
}

export function AnalyticsPreview() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // Get last 6 months data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);

        const response = await fetch(
          `/api/analytics/summary?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
        );

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const chartData = data?.monthlyTrend?.slice(-7) || [];
  const summary = data?.summary;

  return (
    <div 
      onClick={() => router.push('/dashboard/analytics')}
      className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-500">Clica para ver detalhes completos</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary?.totalSales || 0)}
              </div>
              <p className="text-xs text-gray-500">Total de Vendas</p>
            </>
          )}
        </div>
      </div>

      <div className="h-40 -mx-6 px-6">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="commissions" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Sem dados disponíveis
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4">
        <div>
          <p className="text-xs text-gray-500">Comissões Total</p>
          <p className="text-lg font-semibold text-blue-600">
            {loading ? '...' : formatCurrency(summary?.totalCommissions || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">ROI</p>
          <p className="text-lg font-semibold text-purple-600">
            {loading ? '...' : `${summary?.roiPercentage?.toFixed(1) || 0}%`}
          </p>
        </div>
      </div>
    </div>
  );
}
