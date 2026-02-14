'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InfluencerData {
  name: string;
  sales: number;
  commissions: number;
}

interface TopInfluencersChartProps {
  data: InfluencerData[];
}

export function TopInfluencersChart({ data }: TopInfluencersChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Influencers</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value) => `€${(value as number).toFixed(2)}`}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
          />
          <Bar dataKey="sales" fill="#10b981" name="Vendas" />
          <Bar dataKey="commissions" fill="#3b82f6" name="Comissões" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
