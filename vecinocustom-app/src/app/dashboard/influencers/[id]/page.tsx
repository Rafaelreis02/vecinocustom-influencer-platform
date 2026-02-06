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
  Loader2,
  TrendingUp,
  Globe,
  Tag,
  Calendar,
  Award,
  Video
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

  const statusColors: any = {
    working: 'bg-green-500/90',
    negotiating: 'bg-yellow-500/90',
    suggestion: 'bg-blue-500/90',
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
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-xl border-2 border-white/40 flex items-center justify-center text-4xl font-bold shadow-2xl">
              {influencer.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{influencer.name}</h1>
                {influencer.fitScore && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-400/90 text-yellow-900 flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    Fit Score: {influencer.fitScore}/5
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                {influencer.tier && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-xl border border-white/40">
                    {influencer.tier}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[influencer.status] || 'bg-gray-500/90'} flex items-center gap-1.5`}>
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  {statusLabels[influencer.status] || influencer.status}
                </span>
                {influencer.primaryPlatform && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-xl border border-white/40">
                    📱 {influencer.primaryPlatform}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                {influencer.country && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {influencer.country}
                  </span>
                )}
                {influencer.language && (
                  <span className="px-2 py-0.5 rounded bg-white/20 font-medium">
                    {influencer.language}
                  </span>
                )}
                {influencer.niche && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    {influencer.niche}
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

        {/* Contact Info */}
        <div className="flex items-center gap-4 text-white/90 text-sm mb-4">
          {influencer.email && (
            <a href={`mailto:${influencer.email}`} className="flex items-center gap-1.5 hover:text-white transition">
              <Mail className="h-4 w-4" />
              {influencer.email}
            </a>
          )}
          {influencer.phone && (
            <a href={`tel:${influencer.phone}`} className="flex items-center gap-1.5 hover:text-white transition">
              <Phone className="h-4 w-4" />
              {influencer.phone}
            </a>
          )}
          {influencer.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {influencer.address}
            </span>
          )}
        </div>

        {/* Social Links */}
        <div className="flex gap-3">
          {influencer.instagramHandle && (
            <a
              href={`https://instagram.com/${influencer.instagramHandle.replace('@', '')}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition"
            >
              <Instagram className="h-5 w-5" />
              <span className="font-medium">{influencer.instagramHandle}</span>
              {influencer.instagramFollowers && (
                <span className="text-sm opacity-80">
                  ({(influencer.instagramFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {influencer.tiktokHandle && (
            <a
              href={`https://tiktok.com/@${influencer.tiktokHandle.replace('@', '')}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition"
            >
              <Video className="h-5 w-5" />
              <span className="font-medium">{influencer.tiktokHandle}</span>
              {influencer.tiktokFollowers && (
                <span className="text-sm opacity-80">
                  ({(influencer.tiktokFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {influencer.totalLikes && (
          <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Likes</p>
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(Number(influencer.totalLikes) / 1000000).toFixed(1)}M
            </p>
          </div>
        )}

        {influencer.engagementRate !== null && influencer.engagementRate !== undefined && (
          <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Engagement</p>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{influencer.engagementRate}x</p>
          </div>
        )}

        {influencer.averageViews && (
          <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg. Views</p>
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{influencer.averageViews}</p>
          </div>
        )}

        {influencer.contentStability && (
          <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Estabilidade</p>
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <p className={`text-2xl font-bold ${
              influencer.contentStability === 'HIGH' ? 'text-green-600' :
              influencer.contentStability === 'MEDIUM' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {influencer.contentStability}
            </p>
          </div>
        )}

        {influencer.estimatedPrice && (
          <div className="rounded-xl bg-white p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Preço Est.</p>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">€{influencer.estimatedPrice}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Types */}
          {influencer.contentTypes && influencer.contentTypes.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-600" />
                Tipos de Conteúdo
              </h3>
              <div className="flex flex-wrap gap-2">
                {influencer.contentTypes.map((type: string) => (
                  <span
                    key={type}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Campaign History */}
          {influencer.campaigns && influencer.campaigns.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Histórico de Campanhas
              </h3>
              <div className="space-y-2">
                {influencer.campaigns.map((campInfluencer: any) => (
                  <div
                    key={campInfluencer.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{campInfluencer.campaign?.name || 'Campanha'}</p>
                      {campInfluencer.agreedFee && (
                        <p className="text-sm text-gray-500">Fee: €{campInfluencer.agreedFee}</p>
                      )}
                    </div>
                    {campInfluencer.campaign?.status && (
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        campInfluencer.campaign.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {campInfluencer.campaign.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {influencer.notes && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Notas Internas</h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {influencer.notes}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Info Cards */}
        <div className="space-y-6">
          {/* Tags */}
          {influencer.tags && influencer.tags.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-600" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {influencer.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Discovery Info */}
          {(influencer.discoveryMethod || influencer.discoveryDate) && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Descoberta
              </h3>
              <div className="space-y-2 text-sm">
                {influencer.discoveryMethod && (
                  <div>
                    <span className="text-gray-600">Método:</span>
                    <p className="font-medium text-gray-900 mt-1">{influencer.discoveryMethod}</p>
                  </div>
                )}
                {influencer.discoveryDate && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {new Date(influencer.discoveryDate).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Info */}
          <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Informação</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Followers</span>
                <span className="font-medium text-gray-900">
                  {((influencer.instagramFollowers || 0) + (influencer.tiktokFollowers || 0)) / 1000}K
                </span>
              </div>
              {influencer.activeCoupons > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cupões Ativos</span>
                  <span className="font-medium text-purple-600">{influencer.activeCoupons}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-600">Registado em</span>
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
