'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  month: string;
  sales: number;
  commissions: number;
}

interface SalesCommissionsChartProps {
  data: ChartDataPoint[];
}

export function SalesCommissionsChart({ data }: SalesCommissionsChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas vs Comissões</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value) => `€${(value as number).toFixed(2)}`}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#10b981" 
            name="Vendas"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="commissions" 
            stroke="#3b82f6" 
            name="Comissões"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
