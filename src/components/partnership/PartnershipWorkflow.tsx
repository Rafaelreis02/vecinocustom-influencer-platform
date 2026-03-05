'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Circle, Lock, ChevronRight, RefreshCcw, X, Check, Send, Eye } from 'lucide-react';
import { PartnershipStep1 } from './PartnershipStep1';
import { PartnershipStep2 } from './PartnershipStep2';
import { PartnershipStep3 } from './PartnershipStep3';
import { PartnershipStep4 } from './PartnershipStep4';
import { PartnershipStep5 } from './PartnershipStep5';

interface PartnershipWorkflowProps {
  influencerId: string;
  influencerName: string;
  influencerHandle?: string;
  influencerStatus?: string;
  portalUrl?: string;
}

interface Workflow {
  id: string;
  currentStep: number;
  status: string;
  agreedPrice: number | null;
  contactEmail: string | null;
  contactInstagram: string | null;
  contactWhatsapp: string | null;
  shippingAddress: string | null;
  productSuggestion1: string | null;
  productSuggestion2: string | null;
  productSuggestion3: string | null;
  selectedProductUrl: string | null;
  contractSigned: boolean;
  contractUrl: string | null;
  trackingUrl: string | null;
  couponCode: string | null;
  createdAt: string;
  emails: Array<{
    id: string;
    step: number;
    subject: string;
    sentAt: string;
  }>;
}

const STEPS = [
  { number: 1, name: 'Partnership', status: 'ANALYZING' },
  { number: 2, name: 'Shipping', status: 'AGREED' },
  { number: 3, name: 'Preparing', status: 'PRODUCT_SELECTION' },
  { number: 4, name: 'Contract', status: 'CONTRACT_PENDING' },
  { number: 5, name: 'Preparing Shipment', status: 'SHIPPED' },
  { number: 6, name: 'Delivered', status: 'SHIPPED' },
];

export function PartnershipWorkflow({ influencerId, influencerName, influencerHandle, influencerStatus, portalUrl }: PartnershipWorkflowProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [isAcceptingCounter, setIsAcceptingCounter] = useState(false);
  const [isSendingCounter, setIsSendingCounter] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [initialPrice, setInitialPrice] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // Email preview states
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [localInfluencerStatus, setLocalInfluencerStatus] = useState(influencerStatus);

  // Update local status when prop changes
  useEffect(() => {
    setLocalInfluencerStatus(influencerStatus);
  }, [influencerStatus]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${influencerId}/partnerships`);
      const data = await res.json();
      
      if (data.success) {
        setWorkflow(data.data.activePartnership);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load partnership data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [influencerId]);

  const createWorkflow = async () => {
    // Validate price before creating
    if (initialPrice === '') {
      setPriceError('O valor é obrigatório (pode ser 0€ para comissão apenas)');
      return;
    }
    const price = parseFloat(initialPrice);
    if (isNaN(price) || price < 0) {
      setPriceError('Insira um valor válido (≥ 0)');
      return;
    }
    setPriceError(null);

    try {
      setIsCreating(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId, agreedPrice: price }),
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
        setInitialPrice(''); // Reset
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create partnership');
    } finally {
      setIsCreating(false);
    }
  };

  const loadEmailPreview = async () => {
    if (!workflow) return;
    
    try {
      setIsLoadingPreview(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/preview-email`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        setEmailPreview(data.data);
        setShowEmailPreview(true);
      } else {
        setError(data.error || 'Failed to load email preview');
      }
    } catch (err) {
      setError('Failed to load email preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const advanceStep = async () => {
    if (!workflow) return;
    
    try {
      setIsAdvancing(true);
      setAdvanceError(null);
      
      const res = await fetch(`/api/partnerships/${workflow.id}/advance`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
        setShowEmailPreview(false);
        setEmailPreview(null);
      } else {
        setAdvanceError(data.error || data.missing?.join(', '));
      }
    } catch (err) {
      setAdvanceError('Failed to advance step');
    } finally {
      setIsAdvancing(false);
    }
  };

  const restartWorkflow = async () => {
    if (!workflow) return;
    
    if (!confirm('Tem a certeza que quer recomeçar esta parceria? Uma nova parceria será criada.')) {
      return;
    }
    
    try {
      setIsRestarting(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/restart`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to restart partnership');
    } finally {
      setIsRestarting(false);
    }
  };

  const cancelWorkflow = async () => {
    if (!workflow) return;
    
    if (!confirm('Tem a certeza que quer cancelar esta parceria?')) {
      return;
    }
    
    try {
      setIsCancelling(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/cancel`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to cancel partnership');
    } finally {
      setIsCancelling(false);
    }
  };

  const acceptCounterproposal = async () => {
    if (!workflow) return;
    
    if (!confirm('Tem a certeza que quer aceitar esta contraproposta? O influencer será notificado e poderá avançar para o Step 2.')) {
      return;
    }
    
    try {
      setIsAcceptingCounter(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/accept-counter`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to accept counterproposal');
    } finally {
      setIsAcceptingCounter(false);
    }
  };

  const sendCounterproposal = async () => {
    if (!workflow || !counterPrice) return;
    
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) {
      setError('Por favor, insira um valor válido');
      return;
    }
    
    try {
      setIsSendingCounter(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/send-counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedPrice: price }),
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
        // Update local status to COUNTER_PROPOSAL
        if (data.data.influencerStatus) {
          setLocalInfluencerStatus(data.data.influencerStatus);
        }
        setShowCounterModal(false);
        setCounterPrice('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to send counterproposal');
    } finally {
      setIsSendingCounter(false);
    }
  };

  const updateWorkflow = async (updates: Partial<Workflow>): Promise<boolean> => {
    if (!workflow) return false;
    
    try {
      const res = await fetch(`/api/partnerships/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!workflow) {
    // Different message based on influencer status
    if (localInfluencerStatus === 'SUGGESTION') {
      return (
        <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl p-8 text-center">
          <h3 className="text-lg font-medium text-amber-900 mb-2">
            Influencer não contactado
          </h3>
          <p className="text-sm text-amber-700 mb-4">
            Envia um email de introdução antes de iniciar a parceria
          </p>
          <p className="text-xs text-amber-600">
            Vai à página do influencer e clica em "Contactar"
          </p>
        </div>
      );
    }

    if (localInfluencerStatus === 'CONTACTED') {
      return (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-8 text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Influencer contactado
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Email enviado. Se o influencer responder positivamente, inicia a parceria.
          </p>

          {/* Price input inline */}
          <div className="max-w-xs mx-auto mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Valor da Proposta (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={initialPrice}
                onChange={(e) => { setInitialPrice(e.target.value); setPriceError(null); }}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-2 border ${priceError ? 'border-red-300' : 'border-gray-300'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-left">Pode ser 0€ para parcerias apenas com comissão</p>
            {priceError && (
              <p className="text-xs text-red-600 mt-1 text-left">{priceError}</p>
            )}
          </div>

          <button
            onClick={createWorkflow}
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Iniciar Parceria
          </button>
        </div>
      );
    }

    // Default for other statuses
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sem parceria ativa
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Inicia uma nova parceria com {influencerName}
        </p>

        {/* Price input inline */}
        <div className="max-w-xs mx-auto mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
            Valor da Proposta (€) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={initialPrice}
              onChange={(e) => { setInitialPrice(e.target.value); setPriceError(null); }}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-2 border ${priceError ? 'border-red-300' : 'border-gray-300'} rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black`}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-left">Pode ser 0€ para parcerias apenas com comissão</p>
          {priceError && (
            <p className="text-xs text-red-600 mt-1 text-left">{priceError}</p>
          )}
        </div>

        <button
          onClick={createWorkflow}
          disabled={isCreating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Iniciar Parceria
        </button>
      </div>
    );
  }

  const currentStep = workflow.currentStep;
  const isCompleted = workflow.status === 'COMPLETED';
  const isCancelled = workflow.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Progresso da Parceria
          </h3>
          <div className="flex gap-2">
            {/* Restart button - available at step 6 (delivered) or when completed/cancelled */}
            {(currentStep === 6 || isCompleted || isCancelled) && (
              <button
                onClick={restartWorkflow}
                disabled={isRestarting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {isRestarting ? 'A recomeçar...' : 'Reiniciar Parceria'}
              </button>
            )}
            {/* Advance button - only show if not at step 6 and not completed/cancelled */}
            {currentStep < 6 && !isCompleted && !isCancelled && (
              <button
                onClick={cancelWorkflow}
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                {isCancelling ? 'A cancelar...' : 'Cancelar'}
              </button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isCompleted ? 'bg-green-100 text-green-700' :
            isCancelled ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {isCompleted ? 'Concluída' :
             isCancelled ? 'Cancelada' :
             `Step ${currentStep} de 6: ${STEPS[currentStep - 1]?.name || 'Delivered'}`}
          </span>
        </div>

        {/* Resumo de Dados da Parceria */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600" />
            Dados da Parceria
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {/* Step 1 - Partnership Details */}
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Valor Acordado:</span>
              <p className={`font-medium ${workflow.agreedPrice !== null ? 'text-slate-900' : 'text-amber-600'}`}>
                {workflow.agreedPrice === null ? 'Em falta' : 
                 workflow.agreedPrice === 0 ? 'Somente comissão' : 
                 `${workflow.agreedPrice.toFixed(2)}€`}
              </p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Email de Contacto:</span>
              <p className={`font-medium ${workflow.contactEmail ? 'text-slate-900' : 'text-amber-600'}`}>
                {workflow.contactEmail || 'Em falta'}
              </p>
            </div>

            {/* Step 2 - Shipping */}
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Morada de Envio:</span>
              <p className={`font-medium ${workflow.shippingAddress ? 'text-slate-900' : 'text-amber-600'}`}>
                {workflow.shippingAddress || 'Em falta'}
              </p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Sugestão de Produto 1:</span>
              <p className={`font-medium ${workflow.productSuggestion1 ? 'text-slate-900' : 'text-amber-600'}`}>
                {workflow.productSuggestion1 || 'Em falta'}
              </p>
            </div>

            {/* Sugestão 2 */}
            {workflow.productSuggestion2 && (
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 text-xs">Sugestão de Produto 2:</span>
                <p className="font-medium text-slate-900 truncate">
                  {workflow.productSuggestion2}
                </p>
              </div>
            )}

            {/* Sugestão 3 */}
            {workflow.productSuggestion3 && (
              <div className="p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-500 text-xs">Sugestão de Produto 3:</span>
                <p className="font-medium text-slate-900 truncate">
                  {workflow.productSuggestion3}
                </p>
              </div>
            )}

            {/* Step 3 - Preparing */}
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Produto Selecionado:</span>
              <p className={`font-medium ${workflow.selectedProductUrl ? 'text-slate-900' : 'text-amber-600'} truncate`}>
                {workflow.selectedProductUrl ? (
                  <a href={workflow.selectedProductUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Ver produto
                  </a>
                ) : 'Em falta'}
              </p>
            </div>
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Cupom:</span>
              <p className={`font-medium ${workflow.couponCode ? 'text-slate-900 font-mono' : 'text-amber-600'}`}>
                {workflow.couponCode || 'Em falta'}
              </p>
            </div>

            {/* Step 4 - Contract */}
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Contrato Assinado:</span>
              <p className={`font-medium ${workflow.contractSigned ? 'text-green-600' : 'text-amber-600'}`}>
                {workflow.contractSigned ? 'Sim ✓' : 'Em falta'}
              </p>
            </div>

            {/* Step 5 - Shipped */}
            <div className="p-2 bg-white rounded border border-gray-100">
              <span className="text-gray-500 text-xs">Tracking URL:</span>
              <p className={`font-medium ${workflow.trackingUrl ? 'text-slate-900' : 'text-amber-600'} truncate`}>
                {workflow.trackingUrl ? (
                  <a href={workflow.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Ver tracking
                  </a>
                ) : 'Em falta'}
              </p>
            </div>
          </div>
        </div>

        {/* Steps Visual */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const stepIsCompleted = step.number < currentStep;
            const isActive = step.number === currentStep && !stepIsCompleted && !isCancelled;
            const isLocked = step.number > currentStep || stepIsCompleted || isCancelled;

            return (
              <div key={step.number} className="flex items-center">
                <div className={`flex flex-col items-center ${
                  isActive ? 'text-blue-600' :
                  stepIsCompleted ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-blue-600 bg-blue-50' :
                    stepIsCompleted ? 'border-green-600 bg-green-50' :
                    'border-gray-300 bg-gray-100'
                  }`}>
                    {stepIsCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.name}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Counterproposal Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Enviar Nova Proposta
              </h3>
              <button
                onClick={() => setShowCounterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Insira o novo valor que pretende propor ao influencer.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  €
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCounterModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={sendCounterproposal}
                disabled={!counterPrice || isSendingCounter}
                className="flex-1 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCounter ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Enviar Proposta'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Link */}
      {portalUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Link do Portal do Influencer</h4>
              <p className="text-sm text-blue-700 mt-1">
                O influencer acede a este link para preencher os dados e avançar nos steps.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(portalUrl)}
                className="px-3 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                Copiar Link
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Abrir Portal
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {advanceError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              <span className="font-medium">Campos obrigatórios em falta:</span> {advanceError}
            </p>
          </div>
        )}

        {currentStep === 1 && (
          <PartnershipStep1
            workflow={workflow}
            onUpdate={updateWorkflow}
            isLocked={isCompleted || isCancelled}
            influencerStatus={localInfluencerStatus}
            onAcceptCounter={localInfluencerStatus === 'ANALYZING' ? acceptCounterproposal : undefined}
            onSendCounter={localInfluencerStatus === 'ANALYZING' ? () => setShowCounterModal(true) : undefined}
            isAcceptingCounter={isAcceptingCounter}
            isSendingCounter={isSendingCounter}
          />
        )}
        {currentStep === 2 && (
          <PartnershipStep2
            workflow={workflow}
            isLocked={isCompleted || isCancelled}
          />
        )}
        {currentStep === 3 && (
          <PartnershipStep3
            workflow={workflow}
            influencer={{
              id: influencerId,
              name: influencerName,
              tiktokHandle: influencerHandle,
            }}
            onUpdate={updateWorkflow}
            isLocked={isCompleted || isCancelled}
          />
        )}
        {currentStep === 4 && (
          <PartnershipStep4
            workflow={workflow}
            isLocked={isCompleted || isCancelled}
          />
        )}
        {currentStep === 5 && (
          <PartnershipStep5
            workflow={workflow}
            onUpdate={updateWorkflow}
            isLocked={isCompleted || isCancelled}
          />
        )}

        {/* Preview & Advance Buttons - Only for steps 3, 5, 6 where admin can advance */}
        {!isCompleted && !isCancelled && (currentStep === 3 || currentStep === 5 || currentStep === 6) && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={loadEmailPreview}
              disabled={isAdvancing || isLoadingPreview}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Ver Email
                </>
              )}
            </button>
            <button
              onClick={advanceStep}
              disabled={isAdvancing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isAdvancing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : currentStep === 6 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Completar Parceria
                </>
              ) : currentStep === 5 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar Parceria
                </>
              ) : (
                <>
                  Avançar para {STEPS[currentStep]?.name}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Info message for steps where admin cannot advance */}
        {!isCompleted && !isCancelled && currentStep !== 3 && currentStep !== 5 && currentStep !== 6 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">ℹ️ Aguardando influencer:</span> Este step só pode ser avançado pelo influencer através do portal de parceria.
            </p>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {showEmailPreview && emailPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900">Preview do Email</h3>
                <p className="text-xs text-gray-500">
                  Step {emailPreview.step}: {emailPreview.stepName} • {' '}
                  {emailPreview.hasValue ? 'Com valor fixo' : 'Apenas comissão'} • {' '}
                  Template: {emailPreview.templateKey}
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">Assunto</label>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded mt-1">
                  {emailPreview.subject}
                </p>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Corpo do Email</label>
                <div className="mt-1 p-4 bg-white border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {emailPreview.body}
                </div>
              </div>

              {/* Variables used */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <label className="text-xs font-semibold text-blue-700 uppercase">Variáveis Usadas</label>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(emailPreview.variables).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-blue-600 font-mono">{{key}}:</span>
                      <span className="text-blue-800 truncate" title={String(value)}>
                        {String(value) || '(vazio)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEmailPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
              >
                Fechar
              </button>
              <button
                onClick={advanceStep}
                disabled={isAdvancing}
                className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    A enviar...
                  </>
                ) : (
                  'Enviar Email e Avançar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
