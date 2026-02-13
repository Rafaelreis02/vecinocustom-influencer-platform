import { TrendingUp, Percent, DollarSign, ShoppingCart } from 'lucide-react';

interface KPICardsProps {
  totalSales: number;
  totalCommissions: number;
  roiPercentage: number;
  transactionCount: number;
}

export function KPICards({
  totalSales,
  totalCommissions,
  roiPercentage,
  transactionCount,
}: KPICardsProps) {
  const kpis = [
    {
      title: 'Total de Vendas',
      value: `€${totalSales.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total de Comissões',
      value: `€${totalCommissions.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'ROI (%)',
      value: `${roiPercentage.toFixed(2)}%`,
      icon: Percent,
      color: 'text-purple-600',
    },
    {
      title: 'Transações',
      value: transactionCount.toString(),
      icon: ShoppingCart,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.title} className="bg-white rounded-lg border p-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">{kpi.title}</div>
                <div className="text-2xl font-bold mt-2">{kpi.value}</div>
              </div>
              <Icon className={`h-6 w-6 ${kpi.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
