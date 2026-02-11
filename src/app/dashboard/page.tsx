"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/ui/LoadingStates';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  Users,
  Target,
  Ticket,
  DollarSign,
  Eye,
  ArrowRight
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

        const influencers = await influencersRes.json();
        const campaigns = await campaignsRes.json();
        const coupons = await couponsRes.json();

        // Calculate stats
        const totalViews = influencers.reduce((sum: number, inf: any) => {
          const infViews = inf.videos?.reduce((s: number, v: any) => s + (v.views || 0), 0) || 0;
          return sum + infViews;
        }, 0);

        const totalRevenue = coupons.reduce((sum: number, c: any) => sum + (c.totalSales || 0), 0);
        const couponUsage = coupons.reduce((sum: number, c: any) => sum + (c.usageCount || 0), 0);
        
        const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length;
        
        // Get top performers (sort by views)
        const topPerformers = influencers
          .map((inf: any) => ({
            id: inf.id,
            name: inf.name,
            tiktokHandle: inf.tiktokHandle,
            totalViews: inf.videos?.reduce((s: number, v: any) => s + (v.views || 0), 0) || 0,
            engagementRate: inf.engagementRate,
          }))
          .sort((a: any, b: any) => b.totalViews - a.totalViews)
          .slice(0, 3);

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
    setData(null);
    setLoading(true);
    setError(null);
    // Re-trigger useEffect
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Visão geral da plataforma</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visão geral da plataforma
          </p>
        </div>
        <Link
          href="/dashboard/influencers/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Adicionar Influencer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Influencers"
          value={stats.totalInfluencers.toString()}
          subtitle={`${stats.activeInfluencers} ativos`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Campanhas Ativas"
          value={stats.activeCampaigns.toString()}
          subtitle="Em execução"
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Cupões Gerados"
          value={stats.totalCoupons.toString()}
          subtitle={`${stats.couponUsage} utilizações`}
          icon={<Ticket className="h-5 w-5" />}
        />
        <StatCard
          title="Revenue"
          value={`€${stats.totalRevenue.toLocaleString('pt-PT')}`}
          subtitle="Total"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Top Performers */}
        <div className="lg:col-span-2 rounded-lg bg-white p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <Link href="/dashboard/influencers" className="text-sm text-gray-600 hover:text-gray-900">
              Ver todos →
            </Link>
          </div>
          
          {topPerformers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum influencer com vídeos ainda
            </p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((influencer) => (
                <Link
                  key={influencer.id}
                  href={`/dashboard/influencers/${influencer.id}`}
                  className="flex items-center justify-between p-4 rounded-md border border-gray-200 hover:border-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white font-semibold">
                      {influencer.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{influencer.name}</p>
                      <p className="text-sm text-gray-500">
                        {influencer.tiktokHandle || 'Sem handle'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Views</p>
                      <p className="font-semibold text-gray-900">
                        {formatViews(influencer.totalViews)}
                      </p>
                    </div>
                    {influencer.engagementRate !== null && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Engagement</p>
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

        {/* Stats Card */}
        <div className="space-y-6">
          <div className="rounded-lg bg-gray-50 p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Total Views</p>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">
              {formatViews(stats.totalViews)}
            </p>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
              <div 
                className="h-full bg-gray-900 rounded-full transition-all"
                style={{ width: stats.totalViews > 0 ? '75%' : '0%' }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Média de views</span>
                <span className="font-semibold text-gray-900">
                  {stats.totalInfluencers > 0 
                    ? formatViews(Math.round(stats.totalViews / stats.totalInfluencers))
                    : '0'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Revenue médio/cupão</span>
                <span className="font-semibold text-gray-900">
                  €{stats.totalCoupons > 0 
                    ? (stats.totalRevenue / stats.totalCoupons).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
