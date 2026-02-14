'use client';

interface InfluencerData {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  sales: number;
  commissions: number;
  couponsUsed: number;
}

interface TopInfluencersListProps {
  data: InfluencerData[];
}

export function TopInfluencersList({ data }: TopInfluencersListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Top 10 Influencers</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {data.map((influencer, index) => (
          <div key={influencer.id} className="p-4 hover:bg-gray-50 transition">
            <div className="flex items-center gap-4">
              {/* Rank + Avatar */}
              <div className="flex items-center gap-3 min-w-fit">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-sm font-semibold text-gray-700">
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-semibold text-xs">
                  {influencer.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
              </div>

              {/* Name + Handle */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{influencer.name}</p>
                <p className="text-sm text-gray-500 truncate">{influencer.handle}</p>
              </div>

              {/* Total Vendido */}
              <div className="text-right min-w-fit">
                <p className="font-semibold text-gray-900">€{influencer.sales.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{influencer.couponsUsed} usos</p>
              </div>

              {/* Comissão */}
              <div className="text-right min-w-fit">
                <p className="font-semibold text-blue-600">€{influencer.commissions.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{((influencer.commissions / influencer.sales) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
