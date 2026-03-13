'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  CheckCircle2,
  Loader2,
  Send,
  FileText,
  Package,
  Palette,
  Truck,
  Star,
  Plus,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// Compact Steps Definition
const STEPS = [
  { id: 0, name: 'Proposta', icon: Send, description: 'Envio de proposta' },
  { id: 1, name: 'Dados', icon: FileText, description: 'Dados de envio' },
  { id: 2, name: 'Produto', icon: Package, description: 'Confirmação' },
  { id: 3, name: 'Design', icon: Palette, description: 'Aprovação' },
  { id: 4, name: 'Contrato', icon: FileText, description: 'Assinatura' },
  { id: 5, name: 'Envio', icon: Truck, description: 'Tracking' },
  { id: 6, name: 'Completo', icon: Star, description: 'Concluído' },
];

interface PartnershipWorkflowCompactProps {
  influencerId: string;
  influencerEmail?: string | null;
  influencerName: string;
  onUpdate?: () => void;
}

export function PartnershipWorkflowCompact({
  influencerId,
  influencerEmail,
  influencerName,
  onUpdate
}: PartnershipWorkflowCompactProps) {
  const { addToast } = useToast();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Fetch workflow
  useEffect(() => {
    fetchWorkflow();
  }, [influencerId]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/influencers/${influencerId}/partnerships`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data.activeWorkflow || null);
      }
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartnership = async () => {
    if (!influencerEmail) {
      addToast('Influencer has no email', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId,
          agreedPrice: 0,
          commission: 10,
        }),
      });

      if (!res.ok) throw new Error();
      
      addToast('Partnership created!', 'success');
      fetchWorkflow();
      onUpdate?.();
    } catch (error) {
      addToast('Error creating partnership', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAdvanceStep = async () => {
    if (!workflow) return;

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/advance`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error();
      
      addToast('Step advanced!', 'success');
      fetchWorkflow();
      onUpdate?.();
    } catch (error) {
      addToast('Error advancing step', 'error');
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

  // No workflow - Show create button
  if (!workflow) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Plus className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No active partnership</p>
        <p className="text-xs text-gray-400 mb-4">Create a partnership with {influencerName}</p>
        <button
          onClick={handleCreatePartnership}
          disabled={isCreating}
          className="w-full py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-xl hover:bg-[#1a2f4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Partnership
        </button>
      </div>
    );
  }

  const currentStep = workflow.currentStep || 0;
  const progress = Math.min((currentStep / 6) * 100, 100);

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Partnership</h3>
          <Link 
            href={`/dashboard/influencers/${influencerId}`}
            className="text-xs text-gray-400 hover:text-[#0E1E37] flex items-center gap-1 transition-colors"
          >
            Full view <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0E1E37] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-white border-[#0E1E37] shadow-sm' 
                    : isCompleted
                    ? 'bg-white/50 border-gray-200'
                    : 'bg-white/30 border-gray-100 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCurrent 
                      ? 'bg-[#0E1E37] text-white' 
                      : isCompleted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCurrent ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {step.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{step.description}</p>
                  </div>

                  {/* Action */}
                  {isCurrent && (
                    <button
                      onClick={handleAdvanceStep}
                      disabled={isAdvancing}
                      className="w-8 h-8 rounded-full bg-[#0E1E37] text-white flex items-center justify-center hover:bg-[#1a2f4f] transition-colors disabled:opacity-50"
                    >
                      {isAdvancing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Step-specific content */}
                {isCurrent && <StepContent workflow={workflow} step={step.id} onUpdate={fetchWorkflow} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Step-specific content component
function StepContent({ workflow, step, onUpdate }: { workflow: any; step: number; onUpdate: () => void }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Step 3: Design Review - Show send proof button
  if (step === 3) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={async () => {
            // Open design review modal or redirect
            window.open(`/dashboard/partnerships/${workflow.id}/design`, '_blank');
          }}
          className="w-full py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Open Design Review
        </button>
      </div>
    );
  }

  // Step 4: Contract - Show contract status
  if (step === 4) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Contract:</span>
          <span className={`font-medium ${
            workflow.contractSigned ? 'text-green-600' : 'text-amber-600'
          }`}>
            {workflow.contractSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      </div>
    );
  }

  // Step 5: Shipped - Show tracking
  if (step === 5 && workflow.trackingUrl) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <a
          href={workflow.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Truck className="h-3 w-3" />
          Track Package
        </a>
      </div>
    );
  }

  return null;
}
