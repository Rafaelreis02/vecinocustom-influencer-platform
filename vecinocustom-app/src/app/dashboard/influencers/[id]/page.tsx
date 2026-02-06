'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
  Target,
  DollarSign,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function InfluencerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState<any>(null);

  useEffect(() => {
    fetchInfluencer();
  }, []);

  const fetchInfluencer = async () => {
    try {
      const res = await fetch(`/api/influencers/${id}`);
      const data = await res.json();
      setInfluencer(data);
    } catch (error) {
      console.error('Error fetching influencer:', error);
      alert('Erro ao carregar influencer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tens a certeza que queres apagar ${influencer.name}?`)) return;

    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/dashboard/influencers');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao apagar influencer');
      }
    } catch (error) {
      console.error('Error deleting influencer:', error);
      alert('Erro ao apagar influencer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Influencer não encontrado</h3>
        <Link href="/dashboard/influencers" className="text-purple-600 hover:underline">
          Voltar aos Influencers
        </Link>
      </div>
    );
  }

  const statusLabels: any = {
    working: 'A Trabalhar',
    negotiating: 'Em Negociação',
    suggestion: 'Sugestão',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link
        href="/dashboard/influencers"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Influencers
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-xl border-2 border-white/40 flex items-center justify-center text-4xl font-bold shadow-2xl">
              {influencer.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{influencer.name}</h1>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-xl border border-white/40">
                  {influencer.tier || 'Micro'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-500/90 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  {statusLabels[influencer.status] || influencer.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-white/90">
                {influencer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {influencer.email}
                  </span>
                )}
                {influencer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {influencer.phone}
                  </span>
                )}
                {influencer.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {influencer.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/influencers/${id}/edit`}
              className="p-3 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition"
            >
              <Edit className="h-5 w-5" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-3 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-red-500 transition"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-6 flex gap-3">
          {influencer.instagramHandle && (
            <a
              href={`https://instagram.com/${influencer.instagramHandle.replace('@', '')}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition"
            >
              <Instagram className="h-5 w-5" />
              <span className="font-medium">{influencer.instagramHandle}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {influencer.tiktokHandle && (
            <a
              href={`https://tiktok.com/@${influencer.tiktokHandle.replace('@', '')}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition"
            >
              <span className="font-bold">TT</span>
              <span className="font-medium">{influencer.tiktokHandle}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Total Views</p>
            <Eye className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {influencer.totalViews ? (influencer.totalViews / 1000).toFixed(1) + 'K' : '0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">De {influencer.videos?.length || 0} vídeos</p>
        </div>
        <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Engagement Rate</p>
            <Heart className="h-5 w-5 text-pink-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{influencer.avgEngagement || 0}%</p>
          <p className="text-xs text-gray-500 mt-2">Média calculada</p>
        </div>
        <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Campanhas</p>
            <Target className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{influencer.campaigns?.length || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Total de colaborações</p>
        </div>
        <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Revenue Total</p>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">€{influencer.totalRevenue || 0}</p>
          <p className="text-xs text-gray-500 mt-2">De {influencer.coupons?.length || 0} cupões</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Videos & Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Videos */}
          <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Vídeos Recentes
            </h3>
            {influencer.videos && influencer.videos.length > 0 ? (
              <div className="space-y-3">
                {influencer.videos.slice(0, 5).map((video: any) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{video.title || 'Vídeo sem título'}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {video.views ? (video.views / 1000).toFixed(1) + 'K' : '0'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {video.likes ? (video.likes / 1000).toFixed(1) + 'K' : '0'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {video.comments || 0}
                        </span>
                      </div>
                    </div>
                    {video.url && (
                      <a
                        href={video.url}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-purple-100 text-purple-600 transition"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Ainda não há vídeos registados</p>
            )}
          </div>

          {/* Campaign History */}
          <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Histórico de Campanhas
            </h3>
            {influencer.campaigns && influencer.campaigns.length > 0 ? (
              <div className="space-y-2">
                {influencer.campaigns.map((campInfluencer: any) => (
                  <div
                    key={campInfluencer.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{campInfluencer.campaign?.name || 'Campanha'}</p>
                      <p className="text-sm text-gray-500">Fee: €{campInfluencer.agreedFee || 0}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        campInfluencer.campaign?.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {campInfluencer.campaign?.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Ainda não há campanhas</p>
            )}
          </div>
        </div>

        {/* Right Column - Info & Notes */}
        <div className="space-y-6">
          {/* Tags */}
          {influencer.tags && influencer.tags.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {influencer.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {influencer.notes && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Notas Internas</h3>
              <p className="text-sm text-gray-600">{influencer.notes}</p>
            </div>
          )}

          {/* Business Info */}
          <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Informação</h3>
            <div className="space-y-3 text-sm">
              {influencer.instagramFollowers && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Instagram Followers</span>
                  <span className="font-medium text-gray-900">
                    {(influencer.instagramFollowers / 1000).toFixed(1)}K
                  </span>
                </div>
              )}
              {influencer.tiktokFollowers && (
                <div className="flex justify-between">
                  <span className="text-gray-600">TikTok Followers</span>
                  <span className="font-medium text-gray-900">
                    {(influencer.tiktokFollowers / 1000).toFixed(1)}K
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Cupões Ativos</span>
                <span className="font-medium text-purple-600">{influencer.activeCoupons || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data de Registo</span>
                <span className="font-medium text-gray-900">
                  {new Date(influencer.createdAt).toLocaleDateString('pt-PT')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
