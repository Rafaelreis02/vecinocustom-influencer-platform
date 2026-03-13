'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Mail, Instagram, TrendingUp, BarChart3, Video,
  Award, Calendar, ExternalLink, Loader2, MapPin, Hash,
  CheckCircle2, ChevronRight, Plus, Target, Check
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { InfluencerStatusBadge } from '@/components/InfluencerStatusBadge';

interface InfluencerProfileCompactProps {
  influencerId: string;
  onUpdate?: () => void;
}

// Mapeamento EXATO dos steps - deve corresponder a PartnershipWorkflow.tsx
// currentStep 0 = Step 1 "Partnership" (ANALYZING) - Admin analisa proposta
// currentStep 1 = Step 2 "Shipping" (AGREED) - Influencer preenche dados
const STEP_CONFIG: Record<number, { name: string; description: string; adminAction: string | null; waitingFor: string; actionType: 'advance' | 'accept' | 'none' }> = {
  0: { 
    name: 'Partnership', 
    description: 'Analisar proposta do influencer', 
    adminAction: 'Aceitar Proposta',
    waitingFor: 'Admin',
    actionType: 'accept'
  },
  1: { 
    name: 'Shipping', 
    description: 'Influencer preenche dados de envio', 
    adminAction: null,
    waitingFor: 'Influencer',
    actionType: 'none'
  },
  2: { 
    name: 'Preparing', 
    description: 'Confirmar produto escolhido', 
    adminAction: 'Confirmar Produto',
    waitingFor: 'Admin',
    actionType: 'advance'
  },
  3: { 
    name: 'Design Review', 
    description: 'Enviar prova de design', 
    adminAction: 'Enviar Prova',
    waitingFor: 'Admin',
    actionType: 'advance'
  },
  4: { 
    name: 'Contract', 
    description: 'Gerar e enviar contrato', 
    adminAction: 'Gerar Contrato',
    waitingFor: 'Admin',
    actionType: 'advance'
  },
  5: { 
    name: 'Contract Signed', 
    description: 'Aguardar assinatura', 
    adminAction: null,
    waitingFor: 'Influencer',
    actionType: 'none'
  },
  6: { 
    name: 'Shipped', 
    description: 'Adicionar tracking de envio', 
    adminAction: 'Adicionar Tracking',
    waitingFor: 'Admin',
    actionType: 'advance'
  },
  7: { 
    name: 'Completed', 
    description: 'Parceria finalizada', 
    adminAction: 'Completar',
    waitingFor: 'Admin',
    actionType: 'advance'
  },
};

export function InfluencerProfileCompact({ influencerId, onUpdate }: InfluencerProfileCompactProps) {
  const { addToast } = useToast();
  const [influencer, setInfluencer] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingPartnership, setIsCreatingPartnership] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'content'>('overview');

  useEffect(() => {
    fetchData();
  }, [influencerId]);

  const fetchData = async () => {
    if (!influencerId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${influencerId}`);
      
      if (res.ok) {
        const data = await res.json();
        setInfluencer(data);
        // Pega o workflow mais recente do array partnerships
        const workflows = data.partnerships || [];
        setWorkflow(workflows.length > 0 ? workflows[0] : null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartnership = async () => {
    if (!influencer?.email) {
      addToast('Influencer sem email', 'error');
      return;
    }

    const price = parseFloat(agreedPrice);
    if (isNaN(price) || price < 0) {
      addToast('Valor inválido', 'error');
      return;
    }

    try {
      setIsCreatingPartnership(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId,
          agreedPrice: price,
          commission: 20,
        }),
      });

      if (!res.ok) throw new Error();
      
      addToast('Parceria criada!', 'success');
      setShowCreateForm(false);
      setAgreedPrice('');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      addToast('Erro ao criar parceria', 'error');
    } finally {
      setIsCreatingPartnership(false);
    }
  };

  const handleAdvanceStep = async () => {
    if (!workflow) return;

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/advance`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao avançar');
      }
      
      addToast('Step avançado!', 'success');
      await fetchData();
      onUpdate?.();
    } catch (error: any) {
      addToast(error.message || 'Erro ao avançar', 'error');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!workflow) return;

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/accept-counter`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao aceitar');
      }
      
      addToast('Proposta aceite!', 'success');
      await fetchData();
      onUpdate?.();
    } catch (error: any) {
      addToast(error.message || 'Erro ao aceitar proposta', 'error');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleSendCounter = async () => {
    if (!workflow || !counterPrice) return;

    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) {
      addToast('Insira um valor válido', 'error');
      return;
    }

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/send-counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedPrice: price }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao enviar contraproposta');
      }
      
      addToast('Contraproposta enviada!', 'success');
      setShowCounterModal(false);
      setCounterPrice('');
      await fetchData();
      onUpdate?.();
    } catch (error: any) {
      addToast(error.message || 'Erro ao enviar contraproposta', 'error');
    } finally {
      setIsAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-400">Influencer não encontrado</p>
      </div>
    );
  }

  const currentStep = workflow?.currentStep ?? -1;
  const stepConfig = currentStep >= 0 ? STEP_CONFIG[currentStep] : null;
  const totalSteps = 8;
  const displayStep = currentStep + 1;
  const progress = workflow ? Math.min((displayStep / totalSteps) * 100, 100) : 0;

  // DEBUG: Log values for troubleshooting
  console.log('[InfluencerProfileCompact] Debug:', {
    influencerId,
    workflowId: workflow?.id,
    currentStep,
    displayStep,
    workflowStatus: workflow?.status,
    stepConfig: stepConfig?.name,
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] flex items-center justify-center shrink-0">
              {influencer.avatarUrl ? (
                <img src={influencer.avatarUrl} alt={influencer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-semibold">{influencer.name?.charAt(0).toUpperCase()}</span>
              )}
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
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">{influencer.engagementRate?.toFixed(1) || '-'}</p>
            <p className="text-[10px] text-gray-400 uppercase">Eng. Rate</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">{influencer.followerCount ? (influencer.followerCount / 1000).toFixed(1) + 'K' : '-'}</p>
            <p className="text-[10px] text-gray-400 uppercase">Followers</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">{influencer.matchScore || '-'}</p>
            <p className="text-[10px] text-gray-400 uppercase">Match</p>
          </div>
        </div>
      </div>

      {/* WORKFLOW SECTION */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#0E1E37]/5 to-blue-50/50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Workflow Parceria</h4>
          {workflow && (
            <span className="text-xs font-medium text-[#0E1E37]">
              Step {displayStep}/{totalSteps}
            </span>
          )}
        </div>

        {!workflow ? (
          !showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 bg-[#0E1E37] text-white text-sm font-medium rounded-xl hover:bg-[#1a2f4f] flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Parceria
            </button>
          ) : (
            <div className="space-y-3 bg-white rounded-xl p-3 border-2 border-[#0E1E37]">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Acordado (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">€</span>
                  <input
                    type="number"
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border-0 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-[#0E1E37]/20"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePartnership}
                  disabled={isCreatingPartnership || agreedPrice === ''}
                  className="flex-1 py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isCreatingPartnership ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Criar'}
                </button>
              </div>
            </div>
          )
        ) : stepConfig ? (
          <div className="space-y-3">
            {/* Current Step Card */}
            <div className="bg-white rounded-xl p-3 border-2 border-[#0E1E37]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#0E1E37] text-white flex items-center justify-center font-bold text-lg">
                  {displayStep}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{stepConfig.name}</p>
                  <p className="text-xs text-gray-500">{stepConfig.description}</p>
                </div>
              </div>

              {/* Waiting For Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Aguardando:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  stepConfig.waitingFor === 'Admin' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {stepConfig.waitingFor}
                </span>
              </div>

              {/* Action Buttons */}
              {currentStep === 0 && (
                // Step 0 (Partnership/Análise) - Mostrar ações específicas
                workflow?.status === 'COUNTER_PROPOSAL' ? (
                  // Influencer enviou contraproposta → podemos aceitar
                  <button
                    onClick={handleAcceptProposal}
                    disabled={isAdvancing}
                    className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAdvancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Aceitar Contraproposta
                      </>
                    )}
                  </button>
                ) : (
                  // Nossa proposta → avançar (aceitar) ou contrapropor
                  <div className="space-y-2">
                    <button
                      onClick={handleAdvanceStep}
                      disabled={isAdvancing}
                      className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAdvancing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Aceitar Proposta
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCounterModal(true)}
                      className="w-full py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] flex items-center justify-center gap-2"
                    >
                      Enviar Contraproposta
                    </button>
                  </div>
                )
              )}
              
              {currentStep > 0 && stepConfig.adminAction && stepConfig.waitingFor === 'Admin' && (
                // Outros steps → botão de avançar normal
                <button
                  onClick={handleAdvanceStep}
                  disabled={isAdvancing}
                  className="w-full py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAdvancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {stepConfig.adminAction}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {/* Waiting Message (if influencer needs to act) */}
              {stepConfig.waitingFor === 'Influencer' && (
                <div className="flex items-center justify-center gap-2 py-2 bg-blue-50 rounded-lg text-blue-700 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando influencer...
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0E1E37] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{Math.round(progress)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">Erro ao carregar workflow</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'overview', label: 'Info', icon: User },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'content', label: 'Conteúdo', icon: Video },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-[#0E1E37] border-b-2 border-[#0E1E37]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Contacto</h4>
              {influencer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 truncate">{influencer.email}</span>
                </div>
              )}
              {influencer.instagramHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">@{influencer.instagramHandle}</span>
                </div>
              )}
              {influencer.tiktokHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">@{influencer.tiktokHandle}</span>
                </div>
              )}
            </div>

            {influencer.notes && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase">Notas</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{influencer.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-400">Média Views</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {influencer.avgVideoViews ? (influencer.avgVideoViews / 1000).toFixed(1) + 'K' : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-gray-400">Fit Score</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{influencer.fitScore?.toFixed(1) || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-400">Adicionado</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {influencer.createdAt ? new Date(influencer.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-gray-400">Vídeos</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{influencer.videos?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-3">
            {influencer.videos && influencer.videos.length > 0 ? (
              influencer.videos.slice(0, 5).map((video: any) => (
                <div key={video.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">{video.description || 'Sem descrição'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{(video.views / 1000).toFixed(1)}K views</span>
                    <span>•</span>
                    <span>{video.engagementRate?.toFixed(1)}% eng</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Video className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sem vídeos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <Link href={`/dashboard/influencers/${influencerId}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
          Ver Perfil Completo
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* Counter Proposal Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enviar Contraproposta</h3>
            <p className="text-sm text-gray-500 mb-4">Defina o novo valor para a parceria.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">€</span>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-[#0E1E37]/20 focus:border-[#0E1E37]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCounterModal(false);
                  setCounterPrice('');
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendCounter}
                disabled={isAdvancing || !counterPrice}
                className="flex-1 py-2 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] disabled:opacity-50"
              >
                {isAdvancing ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
