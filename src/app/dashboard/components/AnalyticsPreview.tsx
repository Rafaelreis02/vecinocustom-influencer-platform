'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const previewData = [
  { month: 'Jan', sales: 8500, commissions: 1275 },
  { month: 'Fev', sales: 9200, commissions: 1380 },
  { month: 'Mar', sales: 10500, commissions: 1575 },
  { month: 'Abr', sales: 12300, commissions: 1845 },
  { month: 'Mai', sales: 11800, commissions: 1770 },
  { month: 'Jun', sales: 13500, commissions: 2025 },
  { month: 'Jul', sales: 15240, commissions: 2286 },
];

export function AnalyticsPreview() {
  const router = useRouter();

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
          <div className="text-2xl font-bold text-green-600">€15.240,50</div>
          <p className="text-xs text-gray-500">Total de Vendas</p>
        </div>
      </div>

      <div className="h-40 -mx-6 px-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={previewData}>
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
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4">
        <div>
          <p className="text-xs text-gray-500">Comissões Total</p>
          <p className="text-lg font-semibold text-blue-600">€2.286,08</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">ROI</p>
          <p className="text-lg font-semibold text-purple-600">15,0%</p>
        </div>
      </div>
    </div>
  );
}
