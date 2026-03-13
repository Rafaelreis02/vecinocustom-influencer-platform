"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardSkeleton } from '@/components/ui/LoadingStates';
import { ErrorState } from '@/components/ui/ErrorState';
import { AnalyticsPreview } from './components/AnalyticsPreview';
import {
  Users,
  Target,
  Ticket,
  DollarSign,
  Eye,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalInfluencers: number;
    activeInfluencers: number;
    activeCampaigns: number;
    totalCoupons: number;
    couponUsage: number;
    totalRevenue: number;
    totalViews: number;
  };
  topPerformers: Array<{
    id: string;
    name: string;
    tiktokHandle: string | null;
    totalViews: number;
    engagementRate: number | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [influencersRes, campaignsRes, couponsRes] = await Promise.all([
          fetch('/api/influencers'),
          fetch('/api/campaigns'),
          fetch('/api/coupons'),
        ]);

        if (!influencersRes.ok || !campaignsRes.ok || !couponsRes.ok) {
          throw new Error('Falha ao carregar dados');
        }

        const influencersData = await influencersRes.json();
        const campaignsData = await campaignsRes.json();
        const couponsData = await couponsRes.json();

        const influencers = Array.isArray(influencersData) ? influencersData : (influencersData.data || []);
        const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData.data || []);
        const coupons = Array.isArray(couponsData) ? couponsData : (couponsData.data || []);

        const totalViews = influencers.reduce((sum: number, inf: any) => {
          const infViews = inf.videos?.reduce((s: number, v: any) => s + (v.views || 0), 0) || 0;
          return sum + infViews;
        }, 0);

        const totalRevenue = coupons.reduce((sum: number, c: any) => sum + (c.totalSales || 0), 0);
        const couponUsage = coupons.reduce((sum: number, c: any) => sum + (c.usageCount || 0), 0);
        
        const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length;
        
        const topPerformers = influencers
          .map((inf: any) => ({
            id: inf.id,
            name: inf.name,
            tiktokHandle: inf.tiktokHandle,
            totalViews: inf.videos?.reduce((s: number, v: any) => s + (v.views || 0), 0) || 0,
            engagementRate: inf.engagementRate,
          }))
          .sort((a: any, b: any) => b.totalViews - a.totalViews)
          .slice(0, 5);

        setData({
          stats: {
            totalInfluencers: influencers.length,
            activeInfluencers: influencers.filter((i: any) => 
              i.status === 'AGREED' || i.status === 'SHIPPED' || i.status === 'COMPLETED'
            ).length,
            activeCampaigns,
            totalCoupons: coupons.length,
            couponUsage,
            totalRevenue,
            totalViews,
          },
          topPerformers,
        });
      } catch (err: any) {
        console.error('[Dashboard] Error fetching data:', err);
        setError(err.message || 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const retry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Visão geral da plataforma</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error || 'Erro desconhecido'} retry={retry} />;
  }

  const { stats, topPerformers } = data;

  return (
    <div className="space-y-8">
      {/* ✅ Header Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Visão geral da plataforma
          </p>
        </div>
        <Link
          href="/dashboard/influencers/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 shadow-sm"
        >
          Adicionar Influencer
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      {/* Analytics Preview */}
      <div>
        <AnalyticsPreview />
      </div>

      {/* ✅ Stats Cards - Minimalistas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Influencers"
          value={stats.totalInfluencers.toString()}
          subtitle={`${stats.activeInfluencers} ativos`}
          icon={<Users className="h-5 w-5" />}
          trend="+12%"
        />
        <StatCard
          title="Campanhas"
          value={stats.activeCampaigns.toString()}
          subtitle="Ativas"
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Cupões"
          value={stats.totalCoupons.toString()}
          subtitle={`${stats.couponUsage} usados`}
          icon={<Ticket className="h-5 w-5" />}
        />
        <StatCard
          title="Revenue"
          value={`€${stats.totalRevenue.toLocaleString('pt-PT')}`}
          subtitle="Total"
          icon={<DollarSign className="h-5 w-5" />}
          trend="+8%"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Performers - Card Minimalista */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
              <p className="text-sm text-gray-400 mt-0.5">Influencers com melhor performance</p>
            </div>
            <Link 
              href="/dashboard/influencers" 
              className="text-sm font-medium text-[#0E1E37] hover:text-[#1a2f4f] transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
          
          {topPerformers.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-gray-300 mb-3" strokeWidth={1.5} />
              <p className="text-gray-400 text-sm">
                Nenhum influencer com vídeos ainda
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((influencer, index) => (
                <Link
                  key={influencer.id}
                  href={`/dashboard/influencers/${influencer.id}`}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-2xl bg-[#0E1E37] flex items-center justify-center text-white font-semibold text-sm">
                        {influencer.name[0]}
                      </div>
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{influencer.name}</p>
                      <p className="text-sm text-gray-400">
                        {influencer.tiktokHandle || 'Sem handle'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Views</p>
                      <p className="font-semibold text-gray-900">
                        {formatViews(influencer.totalViews)}
                      </p>
                    </div>
                    {influencer.engagementRate !== null && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Eng.</p>
                        <p className="font-semibold text-gray-900">
                          {influencer.engagementRate.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Side Stats */}
        <div className="space-y-4">
          {/* Total Views Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0E1E37]/5 flex items-center justify-center">
                <Eye className="h-5 w-5 text-[#0E1E37]" strokeWidth={1.5} />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" strokeWidth={2} />
            </div>
            <p className="text-3xl font-semibold text-gray-900 mb-1">
              {formatViews(stats.totalViews)}
            </p>
            <p className="text-sm text-gray-400">Total Views</p>
            
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
              <div 
                className="h-full bg-[#0E1E37] rounded-full transition-all duration-500"
                style={{ width: stats.totalViews > 0 ? '70%' : '0%' }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Média de views</span>
                <span className="font-medium text-gray-900">
                  {stats.totalInfluencers > 0 
                    ? formatViews(Math.round(stats.totalViews / stats.totalInfluencers))
                    : '0'
                  }
                </span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Revenue/cupão</span>
                <span className="font-medium text-gray-900">
                  €{stats.totalCoupons > 0 
                    ? (stats.totalRevenue / stats.totalCoupons).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Taxa de uso</span>
                <span className="font-medium text-gray-900">
                  {stats.totalCoupons > 0 
                    ? Math.round((stats.couponUsage / stats.totalCoupons) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Stat Card Minimalista
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-[#0E1E37]/5 flex items-center justify-center text-[#0E1E37]">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}
