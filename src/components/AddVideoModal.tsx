'use client';

import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, User, Eye, Heart, MessageCircle, Share2, Loader2, Plus, DollarSign } from 'lucide-react';

interface AddVideoModalProps {
  campaignId: string;
  campaignHashtag?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Influencer {
  id: string;
  name: string;
  tiktokHandle: string | null;
}

export default function AddVideoModal({ campaignId, campaignHashtag, isOpen, onClose, onSuccess }: AddVideoModalProps) {
  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [formData, setFormData] = useState({
    url: '',
    influencerId: '',
    tiktokHandle: '',
    influencerName: '',
    title: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    cost: '',
    platform: 'TIKTOK',
  });
  const [useExisting, setUseExisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInfluencers();
    }
  }, [isOpen]);

  const fetchInfluencers = async () => {
    try {
      const res = await fetch('/api/influencers?status=working');
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data);
      }
    } catch (error) {
      console.error('Error fetching influencers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate: must have either influencerId OR tiktokHandle
      if (!useExisting && !formData.tiktokHandle) {
        alert('Preenche o @ do TikTok');
        setLoading(false);
        return;
      }

      if (useExisting && !formData.influencerId) {
        alert('Seleciona um influencer');
        setLoading(false);
        return;
      }

      // Create video (API will auto-create influencer if needed)
      const payload: any = {
        url: formData.url,
        title: formData.title || null,
        platform: formData.platform,
        views: formData.views ? parseInt(formData.views) : null,
        likes: formData.likes ? parseInt(formData.likes) : null,
        comments: formData.comments ? parseInt(formData.comments) : null,
        shares: formData.shares ? parseInt(formData.shares) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        campaignId,
        campaignHashtag: campaignHashtag,
      };

      if (useExisting) {
        payload.influencerId = formData.influencerId;
      } else {
        payload.tiktokHandle = formData.tiktokHandle;
        payload.influencerName = formData.influencerName || formData.tiktokHandle;
      }

      const resVideo = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resVideo.ok) {
        // Reset form
        setFormData({
          url: '',
          influencerId: '',
          tiktokHandle: '',
          influencerName: '',
          title: '',
          views: '',
          likes: '',
          comments: '',
          shares: '',
          cost: '',
          platform: 'TIKTOK',
        });
        setUseExisting(false);
        onSuccess();
        onClose();
      } else {
        const data = await resVideo.json();
        alert(data.error || 'Erro ao adicionar vídeo');
      }
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Erro ao adicionar vídeo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Adicionar Vídeo</h2>
            {campaignHashtag && (
              <p className="text-sm text-purple-600 mt-1">#{campaignHashtag}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Video URL */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL do Vídeo (TikTok) *
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                id="url"
                name="url"
                required
                value={formData.url}
                onChange={handleChange}
                placeholder="https://www.tiktok.com/@user/video/123456789"
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Title (optional) */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título do Vídeo (opcional)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Descrição curta do vídeo..."
              className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Influencer by @ Handle */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Influencer (pelo @) *
              </label>
              <button
                type="button"
                onClick={() => setUseExisting(!useExisting)}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700"
              >
                <User className="h-3 w-3" />
                {useExisting ? 'Adicionar pelo @' : 'Selecionar existente'}
              </button>
            </div>

            {!useExisting ? (
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <label htmlFor="tiktokHandle" className="block text-xs font-medium text-gray-700 mb-1">
                    @ TikTok *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input
                      type="text"
                      id="tiktokHandle"
                      name="tiktokHandle"
                      required={!useExisting}
                      value={formData.tiktokHandle}
                      onChange={handleChange}
                      placeholder="beatriz_brito_"
                      className="w-full rounded-md border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Se não existir, será criado automaticamente
                  </p>
                </div>
                <div>
                  <label htmlFor="influencerName" className="block text-xs font-medium text-gray-700 mb-1">
                    Nome (opcional)
                  </label>
                  <input
                    type="text"
                    id="influencerName"
                    name="influencerName"
                    value={formData.influencerName}
                    onChange={handleChange}
                    placeholder="Nome completo"
                    className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <select
                name="influencerId"
                required={useExisting}
                value={formData.influencerId}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none"
              >
                <option value="">Selecionar influencer...</option>
                {influencers.map((inf) => (
                  <option key={inf.id} value={inf.id}>
                    {inf.name} {inf.tiktokHandle ? `(@${inf.tiktokHandle})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cost */}
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
              Preço Pago (€)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                id="cost"
                name="cost"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor pago ao influencer por este conteúdo específico
            </p>
          </div>

          {/* Metrics */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Métricas (opcional)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="views" className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Views
                </label>
                <input
                  type="number"
                  id="views"
                  name="views"
                  min="0"
                  value={formData.views}
                  onChange={handleChange}
                  placeholder="12500"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm focus:border-purple-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="likes" className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Likes
                </label>
                <input
                  type="number"
                  id="likes"
                  name="likes"
                  min="0"
                  value={formData.likes}
                  onChange={handleChange}
                  placeholder="850"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm focus:border-purple-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="comments" className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Comentários
                </label>
                <input
                  type="number"
                  id="comments"
                  name="comments"
                  min="0"
                  value={formData.comments}
                  onChange={handleChange}
                  placeholder="45"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm focus:border-purple-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="shares" className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Partilhas
                </label>
                <input
                  type="number"
                  id="shares"
                  name="shares"
                  min="0"
                  value={formData.shares}
                  onChange={handleChange}
                  placeholder="22"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm focus:border-purple-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A adicionar...
                </>
              ) : (
                'Adicionar Vídeo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
