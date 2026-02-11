'use client';
import { useGlobalToast } from '@/contexts/ToastContext';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Video,
  Tag,
  DollarSign,
  Eye,
  TrendingUp,
  Calendar,
  Hash,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Loader2,
  ExternalLink,
  Plus,
  AlertCircle,
} from 'lucide-react';
import AddVideoModal from '@/components/AddVideoModal';
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  hashtag: string | null;
  platform: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  targetViews: number | null;
  targetSales: number | null;
  status: string;
  createdAt: string;
  videos: Array<{
    id: string;
    title: string | null;
    url: string;
    platform: string;
    views: number | null;
    likes: number | null;
    cost: number | null;
    publishedAt: string | null;
    influencerId: string;
    influencer: {
      id: string;
      name: string;
    };
  }>;
  spent: number;
  totalViews: number;
  influencersCount?: number;
}

const statusConfig = {
  ACTIVE: { label: 'Ativa', color: 'text-green-700 bg-green-50 border-green-200', icon: Play },
  DRAFT: { label: 'Rascunho', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Clock },
  PAUSED: { label: 'Pausada', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Pause },
  COMPLETED: { label: 'Concluída', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-red-700 bg-red-50 border-red-200', icon: Trash2 },
};

// Extrair video ID do TikTok URL
function extractTikTokVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : '';
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { dialog, confirm } = useConfirm();
  const { addToast } = useGlobalToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costValue, setCostValue] = useState<string>('');

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${params.id}`);
      
      if (!res.ok) {
        throw new Error('Campanha não encontrada');
      }
      
      const data = await res.json();
      setCampaign(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Eliminar Campanha',
      message: `Tens a certeza que queres eliminar a campanha "${campaign?.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/dashboard/campaigns');
      } else {
        alert('Erro ao eliminar campanha');
      }
    } catch (error) {
      alert('Erro ao eliminar campanha');
    }
  };

  const handleUpdateCost = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: parseFloat(costValue) || 0 }),
      });

      if (res.ok) {
        addToast('Custo atualizado com sucesso', 'success');
        setEditingCost(null);
        setCostValue('');
        fetchCampaign(); // Refresh data
      } else {
        addToast('Erro ao atualizar custo', 'error');
      }
    } catch (error) {
      addToast('Erro ao atualizar custo', 'error');
    }
  };

  const startEditingCost = (videoId: string, currentCost: number | null) => {
    setEditingCost(videoId);
    setCostValue(currentCost?.toString() || '');
  };

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    const confirmed = await confirm({
      title: 'Eliminar Vídeo',
      message: `Tens a certeza que queres eliminar este vídeo${videoTitle ? ` "${videoTitle}"` : ''}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        addToast('Vídeo eliminado com sucesso', 'success');
        fetchCampaign(); // Refresh data
      } else {
        addToast('Erro ao eliminar vídeo', 'error');
      }
    } catch (error) {
      addToast('Erro ao eliminar vídeo', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Campanha não encontrada'}
        </h3>
        <Link
          href="/dashboard/campaigns"
          className="text-purple-600 hover:text-purple-700"
        >
          Voltar às campanhas
        </Link>
      </div>
    );
  }

  const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;
  const budgetPercent = campaign.budget ? (campaign.spent / campaign.budget) * 100 : 0;
  
  // Calculate unique influencers from videos
  const uniqueInfluencers = new Set(campaign.videos.map(v => v.influencerId)).size;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às Campanhas
      </Link>

      {/* Header Card */}
      <div className="rounded-xl bg-white p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 truncate">
                {campaign.name}
              </h1>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusInfo.color} flex-shrink-0`}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>

            {campaign.description && (
              <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500">
              {campaign.startDate && campaign.endDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span className="truncate">
                    {new Date(campaign.startDate).toLocaleDateString('pt')} - {new Date(campaign.endDate).toLocaleDateString('pt')}
                  </span>
                </span>
              )}
              {campaign.platform && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Tag className="h-4 w-4" />
                  {campaign.platform}
                </span>
              )}
              {campaign.hashtag && (
                <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                  <Hash className="h-4 w-4" />
                  {campaign.hashtag}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Budget */}
        <div className="rounded-lg bg-white p-3 sm:p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs sm:text-sm text-gray-600">Budget</p>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          {campaign.budget && campaign.budget > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  €{campaign.spent.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  / €{campaign.budget.toLocaleString()}
                </p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-900 rounded-full transition-all"
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">
              €{campaign.videos.reduce((sum, v) => sum + (v.cost || 0), 0).toFixed(2)}
            </p>
          )}
        </div>

        {/* Influencers */}
        <div className="rounded-lg bg-white p-3 sm:p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs sm:text-sm text-gray-600">Influencers</p>
            <Tag className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">
            {uniqueInfluencers}
          </p>
        </div>

        {/* Total Views */}
        <div className="rounded-lg bg-white p-3 sm:p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs sm:text-sm text-gray-600">Views Totais</p>
            <Eye className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">
            {campaign.totalViews?.toLocaleString() || '0'}
          </p>
        </div>

        {/* Sales Target */}
        {campaign.targetSales && (
          <div className="rounded-lg bg-white p-3 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600">Meta de Vendas</p>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900">
              {campaign.targetSales.toLocaleString()} vendas
            </p>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div className="rounded-xl bg-white p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-600" />
            Vídeos ({campaign.videos.length})
          </h2>
          <button
            onClick={() => setShowAddVideoModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-black text-white rounded-md text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Vídeo</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>

        {campaign.videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum vídeo publicado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {campaign.videos.map((video) => (
              <div
                key={video.id}
                className="p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors flex flex-col relative"
              >
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteVideo(video.id, video.title || '')}
                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-md z-10 transition-colors"
                  title="Eliminar vídeo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                {/* Video Preview - Fixed Height & Centered */}
                <div className="mb-2 w-full flex-shrink-0 flex items-center justify-center bg-black rounded-lg overflow-hidden" style={{ height: '280px' }}>
                  {video.platform === 'TIKTOK' && video.url && (
                    <iframe
                      src={`https://www.tiktok.com/embed/v2/${extractTikTokVideoId(video.url)}?lang=en-US`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title="TikTok Video"
                    />
                  )}
                  {video.platform === 'INSTAGRAM' && video.url && (
                    <iframe
                      src={`${video.url}embed/captioned/`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title="Instagram Video"
                    />
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {video.influencer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('pt') : 'Data'}
                      </p>
                    </div>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Cost Input */}
                  {editingCost === video.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={costValue}
                        onChange={(e) => setCostValue(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:border-purple-600 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateCost(video.id)}
                        className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                      >
                        
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingCost(video.id, video.cost)}
                      className="px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-200 rounded hover:bg-purple-50 w-full text-center"
                    >
                      €{(video.cost || 0).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coupons feature removed - influencers have their own coupons */}

      {/* Add Video Modal */}
      <AddVideoModal
        campaignId={campaign.id}
        campaignHashtag={campaign.hashtag}
        isOpen={showAddVideoModal}
        onClose={() => setShowAddVideoModal(false)}
        onSuccess={fetchCampaign}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialog} />
    </div>
  );
}
