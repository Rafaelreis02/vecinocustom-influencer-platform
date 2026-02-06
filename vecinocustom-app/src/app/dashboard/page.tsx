import { StatCard } from '@/components/ui/Card';
import {
  Users,
  Target,
  Ticket,
  DollarSign,
  TrendingUp,
  Instagram,
  Eye,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visão geral da plataforma
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
          Adicionar Influencer
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Influencers"
          value="24"
          subtitle="8 ativos este mês"
          icon={<Users className="h-5 w-5" />}
          trend={{ value: '+12%', isPositive: true }}
        />
        <StatCard
          title="Campanhas Ativas"
          value="5"
          subtitle="2 a terminar em breve"
          icon={<Target className="h-5 w-5" />}
          trend={{ value: '+25%', isPositive: true }}
        />
        <StatCard
          title="Cupões Gerados"
          value="18"
          subtitle="142 utilizações"
          icon={<Ticket className="h-5 w-5" />}
          trend={{ value: '+8%', isPositive: true }}
        />
        <StatCard
          title="Revenue"
          value="€12,450"
          subtitle="Este mês"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: '+18%', isPositive: true }}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Top Performers */}
        <div className="lg:col-span-2 rounded-lg bg-white p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Ver todos →
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              { name: 'Bárbara Vasconcelos', handle: '@barbarapaisdv', views: '575.9K', engagement: '8.2%' },
              { name: 'Beatriz Brito', handle: '@beatriz_brito_', views: '180K', engagement: '7.5%' },
              { name: 'Nicole Martinz', handle: '@niicolemartinz', views: '120K', engagement: '6.8%' },
            ].map((influencer, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-md border border-gray-200 hover:border-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white font-semibold">
                    {influencer.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{influencer.name}</p>
                    <p className="text-sm text-gray-500">{influencer.handle}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Views</p>
                    <p className="font-semibold text-gray-900">{influencer.views}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Engagement</p>
                    <p className="font-semibold text-gray-900">{influencer.engagement}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              {[
                { text: 'Novo influencer', time: '2h' },
                { text: 'Campanha iniciada', time: '5h' },
                { text: 'Cupão usado 15x', time: '1d' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{activity.text}</span>
                  <span className="text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Total Views</p>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">2.8M</p>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
              <div className="h-full w-3/4 bg-gray-900 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
