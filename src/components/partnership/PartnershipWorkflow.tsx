'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Circle, Lock, ChevronRight, RefreshCcw, X, Check, Send } from 'lucide-react';
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
  { number: 5, name: 'Shipped', status: 'SHIPPED' },
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
    try {
      setIsCreating(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId }),
      });
      
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create partnership');
    } finally {
      setIsCreating(false);
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
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sem parceria ativa
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Inicia uma nova parceria com {influencerName}
        </p>
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
            {currentStep === 5 && !isCompleted && !isCancelled && (
              <button
                onClick={restartWorkflow}
                disabled={isRestarting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {isRestarting ? 'A recomeçar...' : 'Recomeçar'}
              </button>
            )}
            {!isCancelled && (
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
             `Step ${currentStep} de 5: ${STEPS[currentStep - 1]?.name}`}
          </span>
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

        {/* Advance Button - Only for steps 3 and 5 where admin can advance */}
        {!isCompleted && !isCancelled && (currentStep === 3 || currentStep === 5) && (
          <div className="mt-6 flex justify-end">
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
        {!isCompleted && !isCancelled && currentStep !== 3 && currentStep !== 5 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">ℹ️ Aguardando influencer:</span> Este step só pode ser avançado pelo influencer através do portal de parceria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
