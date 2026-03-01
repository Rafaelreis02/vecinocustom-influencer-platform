import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar, 
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Types
interface FunnelData {
  funnel: {
    prospeccao: number;
    contactados: number;
    propostaEnviada: number;
    aceites: number;
    concluidos: number;
    comissoesGeradas: number;
  };
  conversionRates: Record<string, string>;
  totalInfluencers: number;
}

interface InfluencerMetric {
  id: string;
  name: string;
  instagramHandle: string;
  avatarUrl: string | null;
  status: string;
  totalSales: number;
  totalOrders: number;
  totalCommissions: number;
  totalInvestment: number;
  roi: number;
  hasResponse: boolean;
  responseTime: number | null;
  daysSinceActivity: number;
  lastActivity: string;
}

interface TemporalData {
  bestDayToContact: string | null;
  avgResponseTime: number | null;
  avgPartnershipDuration: number | null;
  recentActivity: any[];
  staleInfluencers: any[];
  responsesByHour: any[];
}

export default function AnalyticsDashboard() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [influencerMetrics, setInfluencerMetrics] = useState<InfluencerMetric[]>([]);
  const [temporalData, setTemporalData] = useState<TemporalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'funnel' | 'influencers' | 'temporal'>('funnel');

  useEffect(() => {
    fetchAllMetrics();
  }, []);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      const [funnelRes, influencersRes, temporalRes] = await Promise.all([
        fetch('/api/analytics/funnel'),
        fetch('/api/analytics/influencers?limit=20&sortBy=sales'),
        fetch('/api/analytics/temporal'),
      ]);

      if (funnelRes.ok) {
        const funnel = await funnelRes.json();
        if (funnel.success) setFunnelData(funnel.data);
      }

      if (influencersRes.ok) {
        const influencers = await influencersRes.json();
        if (influencers.success) setInfluencerMetrics(influencers.data);
      }

      if (temporalRes.ok) {
        const temporal = await temporalRes.json();
        if (temporal.success) setTemporalData(temporal.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Prepare funnel chart data
  const funnelChartData = funnelData ? [
    { name: 'Prospeção', value: funnelData.funnel.prospeccao, fill: '#94a3b8' },
    { name: 'Contactados', value: funnelData.funnel.contactados, fill: '#64748b' },
    { name: 'Proposta', value: funnelData.funnel.propostaEnviada, fill: '#475569' },
    { name: 'Aceites', value: funnelData.funnel.aceites, fill: '#334155' },
    { name: 'Concluídos', value: funnelData.funnel.concluidos, fill: '#0f172a' },
  ] : [];

  // Prepare temporal chart data
  const hourlyData = temporalData?.responsesByHour.map((item: any) => ({
    hour: `${item.hour}:00`,
    responses: parseInt(item.response_count),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Métricas e insights do programa de influencers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'funnel', label: 'Funnel de Conversão', icon: Target },
          { id: 'influencers', label: 'Por Influencer', icon: Users },
          { id: 'temporal', label: 'Temporais', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Funnel View */}
      {activeTab === 'funnel' && funnelData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="Total Influencers"
              value={funnelData.totalInfluencers}
              icon={Users}
              color="bg-blue-100 text-blue-600"
            />
            <MetricCard
              title="Contactados"
              value={funnelData.funnel.contactados}
              change={`${funnelData.conversionRates.contactados}%`}
              icon={Activity}
              color="bg-indigo-100 text-indigo-600"
            />
            <MetricCard
              title="Propostas"
              value={funnelData.funnel.propostaEnviada}
              change={`${funnelData.conversionRates.propostaEnviada}%`}
              icon={Target}
              color="bg-purple-100 text-purple-600"
            />
            <MetricCard
              title="Aceites"
              value={funnelData.funnel.aceites}
              change={`${funnelData.conversionRates.aceites}%`}
              icon={ArrowUpRight}
              color="bg-green-100 text-green-600"
            />
            <MetricCard
              title="Concluídos"
              value={funnelData.funnel.concluidos}
              change={`${funnelData.conversionRates.concluidos}%`}
              icon={TrendingUp}
              color="bg-emerald-100 text-emerald-600"
            />
            <MetricCard
              title="Com Comissões"
              value={funnelData.funnel.comissoesGeradas}
              icon={DollarSign}
              color="bg-amber-100 text-amber-600"
            />
          </div>

          {/* Funnel Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Funnel de Conversão</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Influencers View */}
      {activeTab === 'influencers' && (
        <div className="space-y-6">
          {/* Top Influencers Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Influencers por Vendas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Influencer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Encomendas</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROI</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tempo Resposta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {influencerMetrics.map((inf) => (
                    <tr key={inf.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {inf.avatarUrl ? (
                            <img src={inf.avatarUrl} alt={inf.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                              {inf.name[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{inf.name}</p>
                            {inf.instagramHandle && (
                              <p className="text-sm text-gray-500">@{inf.instagramHandle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inf.status} />
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {inf.totalSales > 0 ? `€${inf.totalSales.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inf.totalOrders > 0 ? inf.totalOrders : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inf.roi !== 0 ? (
                          <span className={`font-medium ${inf.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {inf.roi > 0 ? '+' : ''}{inf.roi}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {inf.responseTime ? `${inf.responseTime}h` : 'Sem resposta'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Temporal View */}
      {activeTab === 'temporal' && temporalData && (
        <div className="space-y-6">
          {/* Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsightCard
              title="Melhor Dia para Contactar"
              value={temporalData.bestDayToContact || 'Sem dados'}
              description="Dia com maior taxa de resposta"
              icon={Calendar}
            />
            <InsightCard
              title="Tempo Médio de Resposta"
              value={temporalData.avgResponseTime ? `${temporalData.avgResponseTime}h` : 'Sem dados'}
              description="Tempo médio até o influencer responder"
              icon={Clock}
            />
            <InsightCard
              title="Duração Média Parceria"
              value={temporalData.avgPartnershipDuration ? `${temporalData.avgPartnershipDuration} dias` : 'Sem dados'}
              description="Desde aceite até envio"
              icon={Activity}
            />
          </div>

          {/* Hourly Response Chart */}
          {hourlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Respostas por Hora do Dia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="responses" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {temporalData.recentActivity.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente (Últimos 7 dias)</h3>
              <div className="space-y-3">
                {temporalData.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {activity.name[0]}
                      </div>
                      <span className="font-medium text-gray-900">{activity.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {activity.last_response ? 'Respondeu' : 'Contactado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stale Influencers */}
          {temporalData.staleInfluencers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Necessitam Atenção (+14 dias sem resposta)</h3>
              <div className="space-y-3">
                {temporalData.staleInfluencers.map((inf: any) => (
                  <div key={inf.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-sm">
                        {inf.name[0]}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{inf.name}</span>
                        {inf.last_contact && (
                          <p className="text-xs text-gray-500">
                            Último contacto: {new Date(inf.last_contact).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                      {inf.days_since_contact || 'Nunca'} dias
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Components
function MetricCard({ title, value, change, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span className="text-xs font-medium text-gray-500">
            {change} conv.
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function InsightCard({ title, value, description, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    UNKNOWN: 'bg-gray-100 text-gray-700',
    SUGGESTION: 'bg-indigo-100 text-indigo-700',
    CONTACTED: 'bg-amber-100 text-amber-700',
    ANALYZING: 'bg-blue-100 text-blue-700',
    COUNTER_PROPOSAL: 'bg-cyan-100 text-cyan-700',
    AGREED: 'bg-emerald-100 text-emerald-700',
    PRODUCT_SELECTION: 'bg-purple-100 text-purple-700',
    CONTRACT_PENDING: 'bg-yellow-100 text-yellow-700',
    SHIPPED: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };

  const labels: Record<string, string> = {
    UNKNOWN: 'Desconhecido',
    SUGGESTION: 'Sugestão',
    CONTACTED: 'Contactado',
    ANALYZING: 'Em Análise',
    COUNTER_PROPOSAL: 'Contraproposta',
    AGREED: 'Acordado',
    PRODUCT_SELECTION: 'Seleção Produto',
    CONTRACT_PENDING: 'Contrato Pendente',
    SHIPPED: 'Enviado',
    COMPLETED: 'Concluído',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}
