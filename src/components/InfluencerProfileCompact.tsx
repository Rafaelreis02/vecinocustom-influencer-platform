'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Mail, Instagram, TrendingUp, BarChart3, Video,
  Award, Calendar, ExternalLink, Loader2, Hash,
  CheckCircle2, ChevronRight, Plus, Ticket, Link2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { InfluencerStatusBadge } from '@/components/InfluencerStatusBadge';

// ─── FLUXO (ver WORKFLOW.md) ──────────────────────────────────────────────────
// Status do influencer é a fonte de verdade para o step atual.
const STATUS_TO_STEP: Record<string, number> = {
  ANALYZING: 0,
  COUNTER_PROPOSAL: 0,
  AGREED: 1,
  PRODUCT_SELECTION: 2,
  DESIGN_REVIEW: 3,
  CONTRACT_PENDING: 4,
  CONTRACT_SIGNED: 5,
  SHIPPED: 6,
  COMPLETED: 7,
};

// Quem age em cada step
const STEP_ACTOR: Record<number, 'admin' | 'influencer'> = {
  0: 'admin',       // Depende do sub-status (ver lógica abaixo)
  1: 'influencer',  // Influencer preenche morada + sugestões
  2: 'admin',       // Admin escolhe produto + cria cupom
  3: 'admin',       // Admin envia prova de design
  4: 'influencer',  // Influencer assina contrato
  5: 'admin',       // Admin adiciona tracking
  6: 'admin',       // Admin marca como completo
  7: 'admin',       // Completo
};

// Campos obrigatórios para avançar cada step
const REQUIRED_FIELDS: Record<number, string[]> = {
  2: ['selectedProductUrl', 'couponCode'],
  5: ['trackingUrl'],
};

// Label do botão de ação por step
const ACTION_LABEL: Record<number, string> = {
  2: 'Confirmar Produto',
  3: 'Enviar Prova',
  5: 'Adicionar Tracking',
  6: 'Completar',
};

// ─────────────────────────────────────────────────────────────────────────────

interface InfluencerProfileCompactProps {
  influencerId: string;
  onUpdate?: () => void;
}

export function InfluencerProfileCompact({ influencerId, onUpdate }: InfluencerProfileCompactProps) {
  const { addToast } = useToast();
  const [influencer, setInfluencer] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'content'>('overview');

  useEffect(() => { fetchData(); }, [influencerId]);

  // Inicializar couponCode quando influencer muda
  useEffect(() => {
    if (influencer && !couponCode) {
      setCouponCode(generateCouponCode());
    }
  }, [influencer]);

  const fetchData = async () => {
    if (!influencerId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${influencerId}`);
      if (res.ok) {
        const data = await res.json();
        setInfluencer(data);
        const wf = (data.partnerships || [])[0] ?? null;
        setWorkflow(wf);
        if (wf?.selectedProductUrl) setProductUrl(wf.selectedProductUrl);
        if (wf?.couponCode) setCouponCode(wf.couponCode);
      }
    } catch (e) {
      console.error('fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateCouponCode = () => {
    const handle = (influencer?.instagramHandle || influencer?.tiktokHandle || '')
      .replace('@', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8) || 'INF';
    return `VECINO_${handle}_10`;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!influencer?.email) return addToast('Influencer sem email', 'error');
    const price = parseFloat(agreedPrice);
    if (isNaN(price) || price < 0) return addToast('Valor inválido', 'error');
    try {
      setIsAdvancing(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId, agreedPrice: price, commission: 20 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro');
      addToast('Parceria criada!', 'success');
      setShowCreateForm(false);
      setAgreedPrice('');
      await fetchData(); onUpdate?.();
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setIsAdvancing(false); }
  };

  const handleAdvance = async () => {
    if (!workflow) return addToast('Workflow não encontrado', 'error');

    // Validar campos obrigatórios
    const required = REQUIRED_FIELDS[currentStep] || [];
    const missing = required.filter(f => !workflow?.[f]);
    if (missing.length > 0) return addToast(`Em falta: ${missing.join(', ')}`, 'error');

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Erro ${res.status}`);
      addToast('Step avançado!', 'success');
      await fetchData(); onUpdate?.();
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setIsAdvancing(false); }
  };

  const handleAccept = async () => {
    if (!workflow) return addToast('Workflow não encontrado', 'error');
    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/accept-counter`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro');
      addToast('Proposta aceite! Email enviado.', 'success');
      await fetchData(); onUpdate?.();
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setIsAdvancing(false); }
  };

  const handleSendCounter = async () => {
    if (!workflow) return;
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) return addToast('Valor inválido', 'error');
    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/send-counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedPrice: price }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro');
      addToast('Contraproposta enviada!', 'success');
      setShowCounterModal(false); setCounterPrice('');
      await fetchData(); onUpdate?.();
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setIsAdvancing(false); }
  };

  const handleSaveProduct = async () => {
    if (!workflow) return;
    if (!productUrl) return addToast('URL do produto é obrigatória', 'error');
    if (!couponCode) return addToast('Código do cupom é obrigatório', 'error');
    try {
      setIsCreatingCoupon(true);
      // 1. Guardar URL do produto
      const patchRes = await fetch(`/api/partnerships/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedProductUrl: productUrl }),
      });
      if (!patchRes.ok) throw new Error('Erro ao guardar produto');
      // 2. Criar cupom na Shopify
      const couponRes = await fetch(`/api/influencers/${influencerId}/create-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.toUpperCase(), workflowId: workflow.id }),
      });
      const couponData = await couponRes.json();
      if (!couponRes.ok) throw new Error(couponData.error || 'Erro ao criar cupom');
      addToast('Produto e cupom guardados!', 'success');
      setShowProductModal(false);
      await fetchData(); onUpdate?.();
    } catch (e: any) { addToast(e.message, 'error'); }
    finally { setIsCreatingCoupon(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
    </div>
  );

  if (!influencer) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-400">Influencer não encontrado</p>
    </div>
  );

  // Step derivado do status (fonte de verdade)
  const currentStep = STATUS_TO_STEP[influencer?.status] ?? -1;
  const isAdminStep = STEP_ACTOR[currentStep] === 'admin';
  const displayStep = currentStep + 1;
  const totalSteps = 8;
  const progress = workflow ? Math.min((displayStep / totalSteps) * 100, 100) : 0;
  const missingFields = (REQUIRED_FIELDS[currentStep] || []).filter(f => !workflow?.[f]);

  return (
    <div className="h-full flex flex-col bg-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] flex items-center justify-center shrink-0">
              {influencer.avatarUrl
                ? <img src={influencer.avatarUrl} alt={influencer.name} className="w-full h-full object-cover" />
                : <span className="text-white text-xl font-semibold">{influencer.name?.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{influencer.name}</h3>
              <InfluencerStatusBadge status={influencer.status} />
            </div>
          </div>
          <Link href={`/dashboard/influencers/${influencerId}`} className="p-2 hover:bg-gray-100 rounded-lg">
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Eng. Rate', value: influencer.engagementRate?.toFixed(1) || '-' },
            { label: 'Followers', value: influencer.followerCount ? (influencer.followerCount / 1000).toFixed(1) + 'K' : '-' },
            { label: 'Match', value: influencer.matchScore || '-' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-2 text-center">
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
              <p className="text-[10px] text-gray-400 uppercase">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workflow ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#0E1E37]/5 to-blue-50/50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Workflow</h4>
          {workflow && <span className="text-xs font-medium text-[#0E1E37]">Step {displayStep}/{totalSteps}</span>}
        </div>

        {/* Sem workflow → Criar */}
        {!workflow ? (
          !showCreateForm ? (
            <button onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 bg-[#0E1E37] text-white text-sm font-medium rounded-xl hover:bg-[#1a2f4f] flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Criar Parceria
            </button>
          ) : (
            <div className="bg-white rounded-xl p-3 border-2 border-[#0E1E37] space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Acordado (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input type="number" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)}
                    placeholder="0" min="0" step="0.01" autoFocus
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0E1E37]/20" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">Cancelar</button>
                <button onClick={handleCreate} disabled={isAdvancing || !agreedPrice}
                  className="flex-1 py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Criar'}
                </button>
              </div>
            </div>
          )

        /* Com workflow */
        ) : currentStep >= 0 ? (
          <div className="space-y-2">
            <div className="bg-white rounded-xl p-3 border-2 border-[#0E1E37]">

              {/* Step header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#0E1E37] text-white flex items-center justify-center font-bold">{displayStep}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{
                    ['Proposta', 'Dados de Envio', 'Preparing', 'Design Review', 'Contrato', 'Contract Signed', 'Enviado', 'Completo'][currentStep] || ''
                  }</p>
                  <p className="text-xs text-gray-400">{isAdminStep ? '→ Ação: Admin' : '→ Ação: Influencer'}</p>
                </div>
                {workflow?.agreedPrice != null && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    €{workflow.agreedPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* ── Step 1 (0): Partnership ──────────────────────────── */}
              {currentStep === 0 && influencer?.status === 'COUNTER_PROPOSAL' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Aguardando resposta do influencer...
                  </div>
                  {workflow?.agreedPrice != null && (
                    <p className="text-xs text-center text-gray-500">
                      Valor proposto por nós: <strong>€{workflow.agreedPrice.toFixed(2)}</strong>
                    </p>
                  )}
                </div>
              )}
              {currentStep === 0 && influencer?.status === 'ANALYZING' && (
                <div className="space-y-2">
                  {workflow?.agreedPrice != null && (
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Valor proposto pelo influencer:</p>
                      <p className="text-xl font-bold text-[#0E1E37]">€{workflow.agreedPrice.toFixed(2)}</p>
                    </div>
                  )}
                  <button onClick={handleAccept} disabled={isAdvancing}
                    className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Aceitar Proposta</>}
                  </button>
                  <button onClick={() => setShowCounterModal(true)}
                    className="w-full py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] flex items-center justify-center gap-2">
                    Enviar Contraproposta
                  </button>
                </div>
              )}

              {/* ── Step 2 (1): Shipping ─────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Aguardando influencer preencher dados...
                  </div>
                  {workflow?.shippingAddress && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 uppercase mb-1">Morada</p>
                      <p className="text-xs text-gray-700">{workflow.shippingAddress}</p>
                    </div>
                  )}
                  {(workflow?.productSuggestion1 || workflow?.productSuggestion2 || workflow?.productSuggestion3) && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 uppercase mb-1">Sugestões</p>
                      {[workflow.productSuggestion1, workflow.productSuggestion2, workflow.productSuggestion3]
                        .filter(Boolean).map((s, i) => <p key={i} className="text-xs text-gray-700 truncate">• {s}</p>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3 (2): Preparing — EXATAMENTE como PartnershipStep3 ── */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  {/* URL Produto Escolhido */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      URL do Produto Escolhido <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="url"
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        placeholder="https://vecinocustom.com/produto/..."
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs focus:border-[#0E1E37] focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">Link do produto selecionado na Shopify</p>
                  </div>

                  {/* Coupon Code Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-purple-600" />
                      <h5 className="font-medium text-purple-900 text-sm">Cupom de Desconto</h5>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-purple-700">
                      <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded">10% OFF</span>
                      <span>+ 20% comissão para o influencer</span>
                    </div>

                    {/* Coupon Code Input */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Código do Cupom <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          disabled={!!workflow?.couponCode}
                          placeholder="VECINO_NOME_10"
                          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs font-mono uppercase focus:border-[#0E1E37] focus:outline-none disabled:bg-gray-100"
                        />
                        {!workflow?.couponCode && (
                          <button
                            onClick={() => setCouponCode(generateCouponCode())}
                            className="px-3 py-2 bg-white border border-purple-300 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100"
                          >
                            Gerar
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">Formato: VECINO_ + nome + _10</p>
                    </div>

                    {/* Create Coupon Button */}
                    {!workflow?.couponCode && (
                      <button
                        onClick={handleSaveProduct}
                        disabled={isCreatingCoupon || !productUrl || !couponCode}
                        className="w-full py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCreatingCoupon ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A criar na Shopify...</>
                        ) : (
                          <><Ticket className="h-3.5 w-3.5" /> Criar Cupom na Shopify</>
                        )}
                      </button>
                    )}

                    {/* Coupon Created Status */}
                    {workflow?.couponCode && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs font-medium text-green-900">Cupom {workflow.couponCode} criado</p>
                            <p className="text-[10px] text-green-700">Ativo na Shopify</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowProductModal(true)}
                          className="w-full py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 flex items-center justify-center gap-1"
                        >
                          Revogar Cupom
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Avançar (só ativo quando tem produto + cupom na BD) */}
                  <button onClick={handleAdvance} disabled={isAdvancing || missingFields.length > 0}
                    className="w-full py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{ACTION_LABEL[2]} <ChevronRight className="h-4 w-4" /></>}
                  </button>
                  {missingFields.length > 0 && (
                    <p className="text-[10px] text-amber-600 text-center">⚠️ Preenche produto e cupom antes de avançar</p>
                  )}
                </div>
              )}

              {/* ── Steps 4-7: Admin genérico ──────────────────────────── */}
              {currentStep >= 3 && isAdminStep && (
                <button onClick={handleAdvance} disabled={isAdvancing}
                  className="w-full py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] disabled:opacity-50 flex items-center justify-center gap-2">
                  {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{ACTION_LABEL[currentStep] || 'Avançar'} <ChevronRight className="h-4 w-4" /></>}
                </button>
              )}

              {/* ── Steps influencer (4 = Contract) ───────────────────── */}
              {currentStep === 4 && (
                <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Aguardando assinatura do contrato...
                </div>
              )}

            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0E1E37] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{Math.round(progress)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">Status desconhecido: {influencer?.status}</p>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'overview', label: 'Info', icon: User },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'content', label: 'Conteúdo', icon: Video },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-[#0E1E37] border-b-2 border-[#0E1E37]' : 'text-gray-400 hover:text-gray-600'}`}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {influencer.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-gray-400" /><span className="text-gray-600 truncate">{influencer.email}</span></div>}
            {influencer.instagramHandle && <div className="flex items-center gap-2 text-sm"><Instagram className="h-4 w-4 text-gray-400" /><span className="text-gray-600">@{influencer.instagramHandle}</span></div>}
            {influencer.tiktokHandle && <div className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4 text-gray-400" /><span className="text-gray-600">@{influencer.tiktokHandle}</span></div>}
            {influencer.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{influencer.notes}</p>}
          </div>
        )}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, color: 'text-green-500', label: 'Avg Views', value: influencer.avgVideoViews ? (influencer.avgVideoViews/1000).toFixed(1)+'K' : '-' },
              { icon: Award, color: 'text-amber-500', label: 'Fit Score', value: influencer.fitScore?.toFixed(1) || '-' },
              { icon: Calendar, color: 'text-blue-500', label: 'Adicionado', value: influencer.createdAt ? new Date(influencer.createdAt).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' }) : '-' },
              { icon: Video, color: 'text-purple-500', label: 'Vídeos', value: influencer.videos?.length || 0 },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1"><item.icon className={`h-4 w-4 ${item.color}`} /><span className="text-xs text-gray-400">{item.label}</span></div>
                <p className="text-lg font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'content' && (
          <div className="space-y-3">
            {influencer.videos?.length > 0
              ? influencer.videos.slice(0,5).map((v: any) => (
                  <div key={v.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm text-gray-800 line-clamp-2 mb-1">{v.description || 'Sem descrição'}</p>
                    <p className="text-xs text-gray-400">{(v.views/1000).toFixed(1)}K views · {v.engagementRate?.toFixed(1)}% eng</p>
                  </div>
                ))
              : <div className="text-center py-8"><Video className="h-12 w-12 mx-auto text-gray-200 mb-2" /><p className="text-sm text-gray-400">Sem vídeos</p></div>
            }
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <Link href={`/dashboard/influencers/${influencerId}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
          Ver Perfil Completo <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Modal: Contraproposta ─────────────────────────────────────────── */}
      {showCounterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Enviar Contraproposta</h3>
            <p className="text-sm text-gray-500 mb-4">Defina o novo valor para a parceria.</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
                placeholder="0" min="0" step="0.01" autoFocus
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#0E1E37]/20" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCounterModal(false); setCounterPrice(''); }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">Cancelar</button>
              <button onClick={handleSendCounter} disabled={isAdvancing || !counterPrice}
                className="flex-1 py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Produto + Cupom ───────────────────────────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Produto e Cupom</h3>
            <p className="text-sm text-gray-500 mb-4">Preenche o produto e o cupom para avançar para Design Review.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL do Produto *</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="url" value={productUrl} onChange={e => setProductUrl(e.target.value)}
                    placeholder="https://vecinocustom.com/produto/..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E1E37]/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código do Cupom *</label>
                <div className="flex gap-2">
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="VECINO_NOME_10"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-[#0E1E37]/20" />
                  <button onClick={() => setCouponCode(generateCouponCode())}
                    className="px-3 py-2 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200">
                    Gerar
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">10% desconto + 20% comissão</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowProductModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">Cancelar</button>
              <button onClick={handleSaveProduct} disabled={isCreatingCoupon || !productUrl || !couponCode}
                className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {isCreatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ticket className="h-4 w-4" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
