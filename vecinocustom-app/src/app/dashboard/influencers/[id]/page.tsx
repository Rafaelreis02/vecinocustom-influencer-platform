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
    <div className="space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      {/* Back Button */}
      <Link
        href="/dashboard/influencers"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Influencers
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-4 sm:p-6 md:p-8 text-white shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-1">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/20 backdrop-blur-xl border-2 border-white/40 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-2xl shrink-0">
              {influencer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{influencer.name}</h1>
                {influencer.fitScore && (
                  <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-yellow-400/90 text-yellow-900 flex items-center gap-1 w-fit">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">Fit {influencer.fitScore}/5</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3 max-w-full">
                {influencer.tier && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-xl border border-white/40">
                    {influencer.tier}
                  </span>
                )}
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${statusColors[influencer.status] || 'bg-gray-500/90'} flex items-center gap-1.5 whitespace-nowrap`}>
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse"></span>
                  {statusLabels[influencer.status] || influencer.status}
                </span>
                {influencer.primaryPlatform && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-xl border border-white/40 whitespace-nowrap">
                    📱 {influencer.primaryPlatform}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90 text-xs sm:text-sm">
                {influencer.country && (
                  <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                    {influencer.country}
                  </span>
                )}
                {influencer.language && (
                  <span className="px-2 py-0.5 rounded bg-white/20 font-medium">
                    {influencer.language}
                  </span>
                )}
                {influencer.niche && (
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{influencer.niche}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Link
              href={`/dashboard/influencers/${id}/edit`}
              className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition active:scale-95"
            >
              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-red-500 transition active:scale-95"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-white/90 text-xs sm:text-sm mb-4">
          {influencer.email && (
            <a href={`mailto:${influencer.email}`} className="flex items-center gap-1.5 hover:text-white transition active:scale-95 min-w-0">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{influencer.email}</span>
            </a>
          )}
          {influencer.phone && (
            <a href={`tel:${influencer.phone}`} className="flex items-center gap-1.5 hover:text-white transition active:scale-95 whitespace-nowrap">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              {influencer.phone}
            </a>
          )}
          {influencer.address && (
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{influencer.address}</span>
            </span>
          )}
        </div>

        {/* Social Links */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-full">
          {influencer.instagramHandle && (
            <a
              href={`https://instagram.com/${influencer.instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition active:scale-95 min-w-0 max-w-full"
            >
              <Instagram className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="font-medium text-xs sm:text-sm truncate flex-1 min-w-0">{influencer.instagramHandle}</span>
              {influencer.instagramFollowers && (
                <span className="text-xs opacity-80 whitespace-nowrap shrink-0">
                  ({(influencer.instagramFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            </a>
          )}
          {influencer.tiktokHandle && (
            <a
              href={`https://tiktok.com/@${influencer.tiktokHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/40 hover:bg-white/30 transition active:scale-95 min-w-0 max-w-full"
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="font-medium text-xs sm:text-sm truncate flex-1 min-w-0">{influencer.tiktokHandle}</span>
              {influencer.tiktokFollowers && (
                <span className="text-xs opacity-80 whitespace-nowrap shrink-0">
                  ({(influencer.tiktokFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            </a>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {influencer.totalLikes && (
          <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Likes</p>
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {(Number(influencer.totalLikes) / 1000000).toFixed(1)}M
            </p>
          </div>
        )}

        {influencer.engagementRate !== null && influencer.engagementRate !== undefined && (
          <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Engagement</p>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{influencer.engagementRate}x</p>
          </div>
        )}

        {influencer.averageViews && (
          <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Avg. Views</p>
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{influencer.averageViews}</p>
          </div>
        )}

        {influencer.contentStability && (
          <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Estabilidade</p>
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />
            </div>
            <p className={`text-lg sm:text-xl md:text-2xl font-bold ${
              influencer.contentStability === 'HIGH' ? 'text-green-600' :
              influencer.contentStability === 'MEDIUM' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {influencer.contentStability}
            </p>
          </div>
        )}

        {influencer.estimatedPrice && (
          <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Preço Est.</p>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-600">€{influencer.estimatedPrice}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-full">
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

          {/* Videos History */}
          {influencer.videos && influencer.videos.length > 0 && (
            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-600" />
                Vídeos Publicados ({influencer.videos.length})
              </h3>
              <div className="space-y-3">
                {influencer.videos.map((video: any) => (
                  <div key={video.id} className="p-4 rounded-xl border border-gray-100 hover:border-purple-200 transition bg-gray-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            video.platform === 'TIKTOK' ? 'bg-black text-white' : 
                            video.platform === 'INSTAGRAM' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {video.platform}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(video.publishedAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-purple-600 truncate block mb-1">
                          {video.title || 'Sem título'}
                        </a>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {(video.views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {(video.likes || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {(video.comments || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {video.cost ? (
                          <>
                            <p className="text-sm font-bold text-gray-900">€{video.cost}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Custo</p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sem custo</span>
                        )}
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
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
