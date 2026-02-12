'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Users, Video, Award, Gift, FileText, X, Loader2 } from 'lucide-react';

interface InfluencerPanelProps {
  influencer?: {
    id: string;
    name: string;
    status?: string;
    email?: string;
    avatarUrl?: string | null;
    socialProfiles?: { platform: string; url: string; followers: number }[];
  } | null;
  onClose?: () => void;
}

interface InfluencerDetails {
  campaigns?: any[];
  videos?: any[];
  coupons?: any[];
  payments?: any[];
  stats?: {
    totalViews?: number;
    totalLikes?: number;
    totalRevenue?: number;
  };
}

export function InfluencerPanel({ influencer, onClose }: InfluencerPanelProps) {
  const [details, setDetails] = useState<InfluencerDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (influencer?.id) {
      fetchInfluencerDetails();
    }
  }, [influencer?.id]);

  async function fetchInfluencerDetails() {
    if (!influencer?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${influencer.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails({
          campaigns: data.campaigns || [],
          videos: data.videos || [],
          coupons: data.coupons || [],
          payments: data.payments || [],
          stats: data.stats || {},
        });
      }
    } catch (error) {
      console.error('Error fetching influencer details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!influencer) {
    return (
      <div className="h-full bg-slate-50 p-6 flex items-center justify-center text-slate-400">
        <p>Seleciona um email para ver info do influencer</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start gap-3">
        {influencer.avatarUrl ? (
          <img 
            src={influencer.avatarUrl} 
            alt={influencer.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
            {influencer.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg text-slate-900 truncate">{influencer.name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Influencer</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">{influencer.status || 'Não definido'}</span>
      </div>

      {/* Redes Sociais */}
      {influencer.socialProfiles && influencer.socialProfiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Users className="h-3 w-3" /> Redes Sociais
          </p>
          <div className="space-y-1">
            {influencer.socialProfiles.map((profile, idx) => (
              <a
                key={idx}
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-slate-50 rounded-lg hover:bg-blue-50 transition text-xs font-semibold text-slate-600"
              >
                {profile.platform} • {profile.followers.toLocaleString()}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Campanhas */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <MessageCircle className="h-3 w-3" /> Campanhas
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </p>
        {loading ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
        ) : details?.campaigns && details.campaigns.length > 0 ? (
          <div className="space-y-1">
            {details.campaigns.slice(0, 3).map((camp: any, idx: number) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs">
                <span className="font-medium text-slate-700">{camp.campaign?.name || 'Campanha'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">Sem campanhas</p>
        )}
      </div>

      {/* Histórico de Vídeos */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Video className="h-3 w-3" /> Vídeos
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </p>
        {loading ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
        ) : details?.videos && details.videos.length > 0 ? (
          <div className="space-y-1">
            {details.videos.slice(0, 3).map((video: any, idx: number) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs flex justify-between">
                <span className="truncate text-slate-700">{video.title || 'Vídeo'}</span>
                {video.views && <span className="text-slate-400">{video.views.toLocaleString()} views</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">Sem vídeos</p>
        )}
      </div>

      {/* Comissões */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Award className="h-3 w-3" /> Comissões
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </p>
        {loading ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
        ) : details?.stats?.totalRevenue ? (
          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg font-medium">
            € {details.stats.totalRevenue.toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">Sem comissões</p>
        )}
      </div>

      {/* Cupom */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Gift className="h-3 w-3" /> Cupom
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </p>
        {loading ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
        ) : details?.coupons && details.coupons.length > 0 ? (
          <div className="space-y-1">
            {details.coupons.slice(0, 2).map((coupon: any, idx: number) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs">
                <span className="font-mono text-slate-700">{coupon.code}</span>
                {coupon.usageCount > 0 && (
                  <span className="text-slate-400 ml-2">{coupon.usageCount} usos</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">Sem cupom</p>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <FileText className="h-3 w-3" /> Notas Internas
        </p>
        <textarea
          placeholder="Adiciona notas sobre este influencer..."
          className="w-full h-20 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>
    </div>
  );
}
