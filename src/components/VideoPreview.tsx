/**
 * Componente VideoPreviewCard
 * 
 * Preview de vídeo com thumbnail, título, stats e link
 * Usado no InfluencerPanel e na página de perfil do influencer
 */

import { useState } from 'react';
import { Play, Eye, Heart, ExternalLink, Video } from 'lucide-react';

interface VideoPreviewCardProps {
  video: {
    id: string;
    title?: string | null;
    url: string;
    platform: string;
    thumbnailUrl?: string | null;
    views?: number | null;
    likes?: number | null;
    publishedAt?: string | null;
  };
  compact?: boolean; // Modo compacto para painel lateral
}

export function VideoPreviewCard({ video, compact = false }: VideoPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Extrair thumbnail do TikTok ou Instagram se não tiver
  const getThumbnail = () => {
    if (video.thumbnailUrl && !imageError) return video.thumbnailUrl;
    
    // Placeholder baseado na plataforma
    if (video.platform === 'TIKTOK') {
      return 'https://placehold.co/400x600/000000/FFFFFF?text=TikTok';
    } else if (video.platform === 'INSTAGRAM') {
      return 'https://placehold.co/400x400/E1306C/FFFFFF?text=Instagram';
    }
    return 'https://placehold.co/400x400/333/FFFFFF?text=Video';
  };

  // Formatar data
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Formatar números
  const formatNumber = (num?: number | null) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Cores por plataforma
  const getPlatformColor = () => {
    switch (video.platform) {
      case 'TIKTOK': return 'bg-black text-white';
      case 'INSTAGRAM': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'YOUTUBE': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (compact) {
    // Modo compacto para painel lateral
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-all"
      >
        {/* Thumbnail mini */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
          <img
            src={getThumbnail()}
            alt={video.title || 'Vídeo'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Play className="h-4 w-4 text-white fill-white" />
          </div>
          {/* Badge plataforma */}
          <span className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded ${getPlatformColor()}`}>
            {video.platform?.slice(0, 3)}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-600">
            {video.title || 'Sem título'}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            {video.views !== null && video.views !== undefined && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {formatNumber(video.views)}
              </span>
            )}
            {video.likes !== null && video.likes !== undefined && (
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3" />
                {formatNumber(video.likes)}
              </span>
            )}
            {video.publishedAt && (
              <span>{formatDate(video.publishedAt)}</span>
            )}
          </div>
        </div>

        {/* Link externo */}
        <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-blue-400 shrink-0" />
      </a>
    );
  }

  // Modo normal (página de perfil)
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] max-h-48 bg-gray-100">
        <img
          src={getThumbnail()}
          alt={video.title || 'Vídeo'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        
        {/* Overlay play */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-6 w-6 text-blue-600 fill-blue-600 ml-1" />
          </div>
        </div>

        {/* Badge plataforma */}
        <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium ${getPlatformColor()}`}>
          {video.platform}
        </span>

        {/* Link externo icon */}
        <div className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition">
          <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600">
          {video.title || 'Sem título'}
        </h4>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {video.views !== null && video.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatNumber(video.views)}
              </span>
            )}
            {video.likes !== null && video.likes !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {formatNumber(video.likes)}
              </span>
            )}
          </div>
          {video.publishedAt && (
            <span className="text-gray-400">{formatDate(video.publishedAt)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

// Componente para mostrar lista de vídeos
interface VideoPreviewListProps {
  videos: any[];
  compact?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function VideoPreviewList({ 
  videos, 
  compact = false, 
  loading = false,
  emptyMessage = 'Sem vídeos'
}: VideoPreviewListProps) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${compact ? 'py-4' : 'py-8'}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-4' : 'py-8'} text-gray-400`}>
        <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {videos.slice(0, 5).map((video) => (
          <VideoPreviewCard key={video.id} video={video} compact />
        ))}
        {videos.length > 5 && (
          <p className="text-xs text-center text-gray-400 py-2">
            +{videos.length - 5} vídeos mais
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {videos.map((video) => (
        <VideoPreviewCard key={video.id} video={video} />
      ))}
    </div>
  );
}
