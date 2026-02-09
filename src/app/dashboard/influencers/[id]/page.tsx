'use client';
import { useGlobalToast } from '@/contexts/ToastContext';
import { StatusDropdown } from '@/components/StatusDropdown';

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
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  Sparkles,
  Loader2,
  TrendingUp,
  Globe,
  Tag,
  Calendar,
  Award,
  Video,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Receipt
} from 'lucide-react';
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog';

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-purple-600" />
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InfluencerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { dialog, confirm: showConfirm } = useConfirm();

  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('10');
  const [couponCommission, setCouponCommission] = useState('10');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

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
      addToast('Erro ao carregar influencer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Apagar Influencer',
      message: `Tens a certeza que queres apagar ${influencer.name}? Esta ação não pode ser desfeita.`,
      confirmText: 'Apagar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/dashboard/influencers');
      } else {
        const data = await res.json();
        addToast(data.error || 'Erro ao apagar influencer', 'error');
      }
    } catch (error) {
      console.error('Error deleting influencer:', error);
      addToast('Erro ao apagar influencer', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponCode.trim()) {
      addToast('Insere o código do cupom', 'error');
      return;
    }

    try {
      setCreatingCoupon(true);

      const res = await fetch(`/api/influencers/${id}/create-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar cupom');
      }

      fetchInfluencer();
      setCouponCode('');
      addToast(`✅ Cupom ${data.coupon.code} criado com sucesso!`, 'success');
    } catch (error) {
      console.error('Error creating coupon:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao criar cupom',
        'error'
      );
    } finally {
      setCreatingCoupon(false);
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
                <div className="flex items-center">
                  <StatusDropdown
                    influencerId={influencer.id}
                    currentStatus={influencer.status}
                    onStatusChange={fetchInfluencer}
                    size="sm"
                  />
                </div>
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

      {/* Collapsible Sections */}
      <div className="space-y-6">
        {/* 📊 Estatísticas Gerais */}
        <CollapsibleSection title="Estatísticas Gerais" icon={BarChart3} defaultOpen={true}>
          <div className="pt-4 space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {influencer.totalLikes && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Total Likes</p>
                    <Heart className="h-3 w-3 text-pink-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {(Number(influencer.totalLikes) / 1000000).toFixed(1)}M
                  </p>
                </div>
              )}

              {influencer.engagementRate !== null && influencer.engagementRate !== undefined && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Engagement</p>
                    <TrendingUp className="h-3 w-3 text-purple-500" />
                  </div>
                  <p className="text-lg font-bold text-purple-600">{influencer.engagementRate.toFixed(1)}%</p>
                </div>
              )}

              {influencer.averageViews && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Avg. Views</p>
                    <Eye className="h-3 w-3 text-blue-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{influencer.averageViews}</p>
                </div>
              )}

              {influencer.estimatedPrice && (
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Preço Est.</p>
                    <DollarSign className="h-3 w-3 text-green-500" />
                  </div>
                  <p className="text-lg font-bold text-green-600">€{influencer.estimatedPrice}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {influencer.tags && influencer.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">TAGS</h4>
                <div className="flex flex-wrap gap-1.5">
                  {influencer.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discovery Info */}
            {(influencer.discoveryMethod || influencer.discoveryDate) && (
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Descoberta</h4>
                <div className="space-y-1 text-xs">
                  {influencer.discoveryMethod && (
                    <div className="text-gray-700">{influencer.discoveryMethod}</div>
                  )}
                  {influencer.discoveryDate && (
                    <div className="text-gray-600">
                      {new Date(influencer.discoveryDate).toLocaleDateString('pt-PT')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 🎬 Histórico de Vídeos */}
        <CollapsibleSection 
          title={`Histórico de Vídeos${influencer.videos ? ` (${influencer.videos.length})` : ''}`} 
          icon={Video}
          defaultOpen={false}
        >
          <div className="pt-6">
            {influencer.videos && influencer.videos.length > 0 ? (
              <div className="space-y-2">
                {influencer.videos.map((video: any) => (
                  <div key={video.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition">
                    <div className="flex items-start justify-between gap-3">
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
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-purple-600 text-sm truncate block mb-1">
                          {video.title || 'Sem título'}
                        </a>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {(video.views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {(video.likes || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {video.cost ? (
                          <div>
                            <p className="text-sm font-bold text-gray-900">€{video.cost}</p>
                            <p className="text-[10px] text-gray-500">Custo</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum vídeo registado</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 💰 Cupão Associado */}
        <CollapsibleSection title="Cupão Associado" icon={DollarSign} defaultOpen={true}>
          <div className="pt-6 space-y-6">
            {/* Current Coupon Display */}
            {influencer.coupon && (
              <div className="p-4 rounded-lg border border-purple-100 bg-purple-50/50">
                <h4 className="text-xs text-gray-600 font-semibold mb-3">CUPOM ATUAL</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Código</p>
                    <p className="text-sm font-mono font-bold text-gray-900">{influencer.coupon.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Desconto</p>
                    <p className="text-lg font-bold text-purple-600">{influencer.coupon.discountValue}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-sm font-semibold text-green-600">✅ Ativo</p>
                  </div>
                </div>
              </div>
            )}

            {/* Create/Edit Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="space-y-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
              <h4 className="text-xs text-gray-600 font-semibold">ATRIBUIR CUPOM</h4>
              
              <div>
                <label className="text-xs font-semibold text-gray-600">Código</label>
                <input
                  type="text"
                  placeholder="Ex: VECINO_JOAO_10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={creatingCoupon}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Desconto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={couponDiscount}
                    onChange={(e) => setCouponDiscount(e.target.value)}
                    disabled={creatingCoupon}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={couponCommission}
                    onChange={(e) => setCouponCommission(e.target.value)}
                    disabled={creatingCoupon}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={creatingCoupon}
                className="w-full px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {creatingCoupon ? '⏳ Criando...' : '✅ Atribuir Cupom'}
              </button>
            </form>
          </div>
        </CollapsibleSection>

        {/* 💵 Histórico de Comissões */}
        <CollapsibleSection title="Histórico de Comissões" icon={Receipt} defaultOpen={false}>
          <div className="pt-6">
            <div className="text-center py-8 text-gray-400">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma comissão registada ainda</p>
              <p className="text-xs mt-1">As comissões aparecerão aqui quando houver vendas com o cupom</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* 📝 Notas */}
        {influencer.notes && (
          <CollapsibleSection title="Notas Internas" icon={Sparkles} defaultOpen={false}>
            <div className="pt-4 text-sm text-gray-700 whitespace-pre-line">
              {influencer.notes}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialog} />
    </div>
  );
}
