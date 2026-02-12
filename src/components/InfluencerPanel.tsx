'use client';

import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Video, Award, Gift, FileText, X } from 'lucide-react';

interface InfluencerPanelProps {
  influencer?: {
    id: string;
    name: string;
    status?: string;
    email?: string;
    socialProfiles?: { platform: string; url: string; followers: number }[];
  } | null;
  onClose?: () => void;
}

export function InfluencerPanel({ influencer, onClose }: InfluencerPanelProps) {
  if (!influencer) {
    return (
      <div className="h-full bg-slate-50 p-6 flex items-center justify-center text-slate-400">
        <p>Seleciona um email para ver info do influencer</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-black text-lg text-slate-900">{influencer.name}</h3>
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
        <Badge className="bg-blue-100 text-blue-600 border-0">{influencer.status || 'Não definido'}</Badge>
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
        </p>
        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
      </div>

      {/* Histórico de Vídeos */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Video className="h-3 w-3" /> Vídeos
        </p>
        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
      </div>

      {/* Comissões */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Award className="h-3 w-3" /> Comissões
        </p>
        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
      </div>

      {/* Cupom */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Gift className="h-3 w-3" /> Cupom
        </p>
        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">A carregar...</p>
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
