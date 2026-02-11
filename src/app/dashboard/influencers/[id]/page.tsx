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
    <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-900" />
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

// Progress Bar Component for Portal Section
function PortalProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Partnership' },
    { num: 2, label: 'Shipping' },
    { num: 3, label: 'Preparing' },
    { num: 4, label: 'Contract' },
    { num: 5, label: 'Shipped' },
  ];
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.num} className="flex items-center flex-1">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  step.num < currentStep
                    ? 'bg-[#27ae60] text-white'
                    : step.num === currentStep
                    ? 'bg-[#0E1E37] text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step.num}
              </div>
              <span className="text-[10px] text-gray-600 mt-1 whitespace-nowrap">{step.label}</span>
            </div>
            {/* Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 transition-colors ${
                  step.num < currentStep ? 'bg-[#27ae60]' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
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
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [chosenProduct, setChosenProduct] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  useEffect(() => {
    fetchInfluencer();
  }, []);

  const fetchInfluencer = async () => {
    try {
      const res = await fetch(`/api/influencers/${id}`);
      const data = await res.json();
      setInfluencer(data);
      
      // Load portal fields
      setAgreedPrice(data.agreedPrice?.toString() || '');
      setChosenProduct(data.chosenProduct || '');
      setTrackingUrl(data.trackingUrl || '');
      
      // Reconstruct portal URL if portalToken exists
      if (data.portalToken && typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        setPortalUrl(`${baseUrl}/portal/${data.portalToken}`);
      }
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

      const res = await fetch(`/api/influencers/${id}/coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: couponCode.toUpperCase(),
          discountPercent: parseFloat(couponDiscount),
          commissionPercent: parseFloat(couponCommission),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar cupom');
      }

      fetchInfluencer();
      setCouponCode('');
      addToast(`Cupom ${data.coupon.code} criado com sucesso!`, 'success');
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

  const handleDeleteCoupon = async () => {
    const confirmed = await showConfirm({
      title: 'Apagar Cupão',
      message: 'Tens a certeza que queres apagar este cupão? Esta ação não pode ser desfeita.',
      confirmText: 'Apagar',
      cancelText: 'Cancelar',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/influencers/${id}/coupon`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao apagar cupom');
      }

      fetchInfluencer();
      addToast('Cupão apagado com sucesso', 'success');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao apagar cupom',
        'error'
      );
    }
  };

  const handleGeneratePortalLink = async () => {
    try {
      setGeneratingLink(true);

      const res = await fetch(`/api/influencers/${id}/generate-link`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar link do portal');
      }

      setPortalUrl(data.portalUrl);
      addToast('Link do portal gerado com sucesso', 'success');
    } catch (error) {
      console.error('Error generating portal link:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao gerar link do portal',
        'error'
      );
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyPortalLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      addToast('Link copiado para a área de transferência!', 'success');
    }
  };

  const handleSavePortalField = async (field: string, value: string | number | null) => {
    try {
      setSavingField(field);
      
      const res = await fetch(`/api/influencers/${id}/portal-fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ao guardar ${field}`);
      }

      setInfluencer(data);
      addToast('Campo guardado com sucesso', 'success');
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      addToast(
        error instanceof Error ? error.message : `Erro ao guardar ${field}`,
        'error'
      );
    } finally {
      setSavingField(null);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: { [key: string]: string } = {
      'ANALYZING': 'AGREED',
      'COUNTER_PROPOSAL': 'AGREED',
      'PRODUCT_SELECTION': 'CONTRACT_PENDING',
      'CONTRACT_PENDING': 'SHIPPED',
    };
    return statusFlow[currentStatus] || null;
  };

  const getAdvanceButtonText = (currentStatus: string): string => {
    const buttonTexts: { [key: string]: string } = {
      'ANALYZING': 'Aceitar contraproposta (→ Agreed)',
      'COUNTER_PROPOSAL': 'Aceitar contraproposta (→ Agreed)',
      'PRODUCT_SELECTION': 'Produto escolhido (→ Contract Pending)',
      'CONTRACT_PENDING': 'Contrato assinado (→ Shipped)',
    };
    return buttonTexts[currentStatus] || '';
  };

  const handleAdvanceStatus = async () => {
    const nextStatus = getNextStatus(influencer.status);
    if (!nextStatus) return;

    const confirmed = await showConfirm({
      title: 'Avançar Status',
      message: `Tens a certeza que queres avançar o status para ${nextStatus}?`,
      confirmText: 'Avançar',
      cancelText: 'Cancelar',
      isDangerous: false,
    });

    if (!confirmed) return;

    try {
      setAdvancingStatus(true);
      
      const res = await fetch(`/api/influencers/${id}/portal-fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao avançar status');
      }

      setInfluencer(data);
      addToast(` Status avançado para ${nextStatus}!`, 'success');
    } catch (error) {
      console.error('Error advancing status:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao avançar status',
        'error'
      );
    } finally {
      setAdvancingStatus(false);
    }
  };

  const getStepFromStatus = (status: string): number => {
    switch (status) {
      case 'COUNTER_PROPOSAL':
      case 'ANALYZING':
        return 1;
      case 'AGREED':
        return 2;
      case 'PRODUCT_SELECTION':
        return 3;
      case 'CONTRACT_PENDING':
        return 4;
      case 'SHIPPED':
        return 5;
      default:
        return 1;
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
        <Link href="/dashboard/influencers" className="text-slate-700 hover:text-slate-900 underline">
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
        className="inline-flex items-center gap-2 text-gray-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Influencers
      </Link>

      {/* Header Card */}
      <div className="rounded-lg bg-slate-900 p-6 text-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-1">
            <div className="h-16 w-16 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
              {influencer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{influencer.name}</h1>
                {influencer.fitScore && (
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-white/10 text-white flex items-center gap-1 w-fit">
                    <Award className="h-3 w-3" />
                    <span className="whitespace-nowrap">Fit {influencer.fitScore}/5</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3 max-w-full">
                {influencer.tier && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 border border-white/20">
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
                  <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 border border-white/20">
                    {influencer.primaryPlatform}
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
                  <span className="px-2 py-0.5 rounded bg-white/10 font-medium text-xs">
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
              className="p-2 rounded bg-white/10 border border-white/20 hover:bg-white/20 transition active:scale-95"
            >
              <Edit className="h-4 w-4 text-white" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 rounded bg-white/10 border border-white/20 hover:bg-red-900/50 transition active:scale-95"
            >
              <Trash2 className="h-4 w-4 text-white" />
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
              className="flex items-center gap-2 px-3 py-2 rounded border border-white/20 bg-white/5 hover:bg-white/10 transition active:scale-95 min-w-0 max-w-full"
            >
              <Instagram className="h-4 w-4 text-white shrink-0" />
              <span className="font-medium text-xs truncate flex-1 min-w-0 text-white">{influencer.instagramHandle}</span>
              {influencer.instagramFollowers && (
                <span className="text-xs opacity-70 whitespace-nowrap shrink-0">
                  ({(influencer.instagramFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-3 w-3 shrink-0 text-white" />
            </a>
          )}
          {influencer.tiktokHandle && (
            <a
              href={`https://tiktok.com/@${influencer.tiktokHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded border border-white/20 bg-white/5 hover:bg-white/10 transition active:scale-95 min-w-0 max-w-full"
            >
              <Video className="h-4 w-4 text-white shrink-0" />
              <span className="font-medium text-xs truncate flex-1 min-w-0 text-white">{influencer.tiktokHandle}</span>
              {influencer.tiktokFollowers && (
                <span className="text-xs opacity-70 whitespace-nowrap shrink-0">
                  ({(influencer.tiktokFollowers / 1000).toFixed(1)}K)
                </span>
              )}
              <ExternalLink className="h-3 w-3 shrink-0 text-white" />
            </a>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-6">
        {/* Estatísticas Gerais */}
        <CollapsibleSection title="Estatísticas Gerais" icon={BarChart3} defaultOpen={true}>
          <div className="pt-4 space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {influencer.totalLikes && (
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Total Likes</p>
                    <Heart className="h-3 w-3 text-slate-700" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {(Number(influencer.totalLikes) / 1000000).toFixed(1)}M
                  </p>
                </div>
              )}

              {influencer.engagementRate !== null && influencer.engagementRate !== undefined && (
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Engagement</p>
                    <TrendingUp className="h-3 w-3 text-slate-700" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{influencer.engagementRate.toFixed(1)}%</p>
                </div>
              )}

              {influencer.averageViews && (
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Avg. Views</p>
                    <Eye className="h-3 w-3 text-slate-700" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{influencer.averageViews}</p>
                </div>
              )}

              {influencer.estimatedPrice && (
                <div className="p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Preço Est.</p>
                    <DollarSign className="h-3 w-3 text-slate-700" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">€{influencer.estimatedPrice}</p>
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
                      className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discovery Info */}
            {(influencer.discoveryMethod || influencer.discoveryDate) && (
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Descoberta</h4>
                <div className="space-y-1 text-xs">
                  {influencer.discoveryMethod && (
                    <div className="text-slate-700">{influencer.discoveryMethod}</div>
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

        {/* Histórico de Vídeos */}
        <CollapsibleSection 
          title={`Histórico de Vídeos${influencer.videos ? ` (${influencer.videos.length})` : ''}`} 
          icon={Video}
          defaultOpen={false}
        >
          <div className="pt-4">
            {influencer.videos && influencer.videos.length > 0 ? (
              <div className="space-y-2">
                {influencer.videos.map((video: any) => (
                  <div key={video.id} className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            video.platform === 'TIKTOK' ? 'bg-slate-900 text-white' : 
                            video.platform === 'INSTAGRAM' ? 'bg-slate-700 text-white' : 
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {video.platform}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(video.publishedAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-slate-700 text-sm truncate block mb-1">
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
                            <p className="text-sm font-bold text-slate-900">€{video.cost}</p>
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

        {/*  Cupão Associado */}
        <CollapsibleSection title="Cupão Associado" icon={DollarSign} defaultOpen={true}>
          <div className="pt-4 space-y-4">
            {/* Current Coupon Display */}
            {influencer.coupons && influencer.coupons.length > 0 && (
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-xs text-gray-600 font-semibold">CUPOM ATUAL</h4>
                  {influencer.coupons[0].shopifyPriceRuleId && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 flex items-center gap-1">
                      Shopify ✓
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Código</p>
                    <p className="text-sm font-mono font-bold text-slate-900">{influencer.coupons[0].code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Desconto</p>
                    <p className="text-lg font-bold text-slate-900">{influencer.coupons[0].discountValue}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Comissão</p>
                    <p className="text-lg font-bold text-slate-900">{influencer.coupons[0].commissionRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Usos</p>
                    <p className="text-lg font-bold text-slate-900">{influencer.coupons[0].usageCount || 0}</p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteCoupon}
                  className="w-full px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                >
                  🗑️ Apagar Cupão
                </button>
              </div>
            )}

            {/* Create Coupon Form - Only show if no active coupon */}
            {(!influencer.coupons || influencer.coupons.length === 0) && (
              <form onSubmit={handleCreateCoupon} className="space-y-3 p-3 rounded-lg border border-gray-200 bg-white">
                <h4 className="text-xs text-gray-600 font-semibold">ATRIBUIR CUPOM</h4>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600">Código</label>
                  <input
                    type="text"
                    placeholder="Ex: VECINO_JOAO_10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={creatingCoupon}
                    className="w-full mt-1 px-3 py-2 text-sm rounded border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Desconto (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(e.target.value)}
                      disabled={creatingCoupon}
                      className="w-full mt-1 px-3 py-2 text-sm rounded border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
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
                      className="w-full mt-1 px-3 py-2 text-sm rounded border border-gray-200 bg-white text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={creatingCoupon}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {creatingCoupon ? 'Criando...' : 'Atribuir Cupom'}
                </button>
              </form>
            )}
          </div>
        </CollapsibleSection>

        {/* 💵 Histórico de Comissões */}
        <CollapsibleSection title="Histórico de Comissões" icon={Receipt} defaultOpen={false}>
          <div className="pt-4">
            {influencer.coupons && influencer.coupons.length > 0 && influencer.coupons[0].totalSales > 0 ? (
              <div className="space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Total Vendas</p>
                    <p className="text-lg font-bold text-slate-900">
                      {influencer.coupons[0].usageCount || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Valor Vendas</p>
                    <p className="text-lg font-bold text-slate-900">
                      €{(influencer.coupons[0].totalSales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 mb-1">Comissão Total</p>
                    <p className="text-lg font-bold text-green-600">
                      €{((influencer.coupons[0].totalSales || 0) * ((influencer.coupons[0].commissionRate || 0) / 100)).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment Records */}
                {influencer.payments && influencer.payments.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs text-gray-600 font-semibold mt-4">HISTÓRICO DE PAGAMENTOS</h4>
                    {influencer.payments.map((payment: any) => (
                      <div key={payment.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">€{payment.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{payment.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(payment.createdAt).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                          <div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              payment.status === 'PAID' ? 'bg-green-100 text-green-700' :
                              payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              payment.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma comissão registada ainda</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Portal do Influencer */}
        <CollapsibleSection title="Portal do Influencer" icon={ExternalLink} defaultOpen={true}>
          <div className="pt-4 space-y-6">
            {/* Progress Bar */}
            <div>
              <PortalProgressBar currentStep={getStepFromStatus(influencer.status)} />
              <p className="text-sm text-gray-600 text-center">
                Status: <span className="font-semibold">{influencer.status}</span> — Step {getStepFromStatus(influencer.status)}
              </p>
            </div>

            <hr className="border-gray-200" />

            {/* Portal Link */}
            {portalUrl ? (
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                <h4 className="text-xs text-gray-600 font-semibold">LINK DO PORTAL</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={portalUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 bg-white text-slate-900 font-mono"
                  />
                  <button
                    onClick={copyPortalLink}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded hover:bg-slate-800 transition"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Este link permite ao influencer aceder ao portal e acompanhar o progresso da parceria.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-gray-200 bg-white space-y-3">
                <h4 className="text-xs text-gray-600 font-semibold">GERAR LINK DO PORTAL</h4>
                <p className="text-sm text-gray-600">
                  Gera um link único para este influencer aceder ao portal de parceria.
                </p>
                <button
                  onClick={handleGeneratePortalLink}
                  disabled={generatingLink}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {generatingLink ? 'A gerar...' : 'Gerar Link do Portal'}
                </button>
              </div>
            )}

            <hr className="border-gray-200" />

            {/* Agreed Price */}
            <div className="space-y-2">
              <h4 className="text-xs text-gray-600 font-semibold">VALOR PROPOSTO AO INFLUENCER (€)</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 bg-white text-slate-900"
                />
                <button
                  onClick={() => handleSavePortalField('agreedPrice', agreedPrice === '' ? null : parseFloat(agreedPrice))}
                  disabled={savingField === 'agreedPrice'}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {savingField === 'agreedPrice' ? 'Guardando' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Influencer Suggestions */}
            {(influencer.productSuggestion1 || influencer.productSuggestion2 || influencer.productSuggestion3 || influencer.shippingAddress) && (
              <>
                <hr className="border-gray-200" />
                <div className="space-y-3">
                  <h4 className="text-xs text-gray-600 font-semibold">SUGESTÕES DO INFLUENCER</h4>
                  {influencer.productSuggestion1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">1.</span>
                      <a
                        href={influencer.productSuggestion1}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline flex-1 truncate"
                      >
                        {influencer.productSuggestion1}
                      </a>
                      <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                    </div>
                  )}
                  {influencer.productSuggestion2 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">2.</span>
                      <a
                        href={influencer.productSuggestion2}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline flex-1 truncate"
                      >
                        {influencer.productSuggestion2}
                      </a>
                      <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                    </div>
                  )}
                  {influencer.productSuggestion3 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">3.</span>
                      <a
                        href={influencer.productSuggestion3}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline flex-1 truncate"
                      >
                        {influencer.productSuggestion3}
                      </a>
                      <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                    </div>
                  )}
                  {!influencer.productSuggestion1 && !influencer.productSuggestion2 && !influencer.productSuggestion3 && !influencer.shippingAddress && (
                    <p className="text-sm text-gray-500 italic">Nenhuma informação enviada ainda</p>
                  )}
                  
                  {influencer.shippingAddress && (
                    <div className="mt-3">
                      <h5 className="text-xs text-gray-600 font-semibold mb-2">MORADA FORNECIDA</h5>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                        {influencer.shippingAddress}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <hr className="border-gray-200" />

            {/* Chosen Product */}
            <div className="space-y-2">
              <h4 className="text-xs text-gray-600 font-semibold">URL DO PRODUTO ESCOLHIDO</h4>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={chosenProduct}
                  onChange={(e) => setChosenProduct(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 bg-white text-slate-900"
                />
                <button
                  onClick={() => handleSavePortalField('chosenProduct', chosenProduct)}
                  disabled={savingField === 'chosenProduct'}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {savingField === 'chosenProduct' ? 'Guardando' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Tracking URL */}
            <div className="space-y-2">
              <h4 className="text-xs text-gray-600 font-semibold">URL DE TRACKING</h4>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 bg-white text-slate-900"
                />
                <button
                  onClick={() => handleSavePortalField('trackingUrl', trackingUrl)}
                  disabled={savingField === 'trackingUrl'}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {savingField === 'trackingUrl' ? 'Guardando' : 'Guardar'}
                </button>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Advance Status Button */}
            {getNextStatus(influencer.status) && (
              <button
                onClick={handleAdvanceStatus}
                disabled={advancingStatus || influencer.status === 'AGREED'}
                className="w-full px-4 py-3 rounded bg-[#0E1E37] text-white text-sm font-semibold hover:bg-[#1a2f4f] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {advancingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A avançar...
                  </>
                ) : (
                  <>
                    🔄 {getAdvanceButtonText(influencer.status)}
                  </>
                )}
              </button>
            )}
            {influencer.status === 'AGREED' && (
              <p className="text-sm text-gray-500 italic text-center">
                O influencer avança este passo através do portal (Step 2)
              </p>
            )}
            {influencer.status === 'SHIPPED' && (
              <p className="text-sm text-green-600 font-semibold text-center">
                 Encomenda enviada — Status final
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Notas */}
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
