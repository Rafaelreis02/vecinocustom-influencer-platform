'use client';

import { useState } from 'react';
import { Euro, Loader2, Check, User } from 'lucide-react';

interface PartnershipStep1Props {
  workflow: {
    agreedPrice: number | null;
    contactEmail: string | null;
    contactInstagram: string | null;
    contactWhatsapp: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
  influencerStatus?: string;
}

export function PartnershipStep1({ workflow, onUpdate, isLocked, influencerStatus }: PartnershipStep1Props) {
  const [formData, setFormData] = useState({
    agreedPrice: workflow.agreedPrice?.toString() || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates: any = {};
    
    if (formData.agreedPrice !== '') {
      updates.agreedPrice = parseFloat(formData.agreedPrice);
    }
    
    const success = await onUpdate(updates);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 1: Partnership</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-blue-600">Por nós:</span> Definir o valor da parceria
        </p>
      </div>

      {/* Status Messages during negotiation */}
      {influencerStatus === 'COUNTER_PROPOSAL' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Proposta Enviada
            </span>
          </div>
          <p className="text-sm text-blue-900 font-medium">
            Proposta de {workflow.agreedPrice?.toFixed(2) || '0.00'}€ enviada ao influencer
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Aguardando resposta do influencer (aceitar ou contraproposta)
          </p>
        </div>
      )}

      {influencerStatus === 'ANALYZING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Contraproposta Recebida
            </span>
          </div>
          <p className="text-sm text-amber-900 font-medium">
            O influencer propôs {workflow.agreedPrice?.toFixed(2) || '0.00'}€
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Aguardando a nossa resposta (aceitar ou renegociar)
          </p>
        </div>
      )}

      {/* Valor Acordado - Nosso campo (só mostra se ainda não estiver em negociação) */}
      {(!influencerStatus || influencerStatus === 'UNKNOWN') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Valor Acordado (€) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.agreedPrice}
              onChange={(e) => handleChange('agreedPrice', e.target.value)}
              disabled={isLocked}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <p className="text-xs text-gray-500">Pode ser 0€ para parcerias apenas com comissão</p>
        </div>
      )}

      {/* Dados do Influencer - Só leitura */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Dados do Influencer (preenchidos no portal)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="text-gray-900">{workflow.contactEmail || <span className="text-gray-400 italic">Aguardando...</span>}</p>
          </div>
          <div>
            <span className="text-gray-500">Instagram:</span>
            <p className="text-gray-900">{workflow.contactInstagram || <span className="text-gray-400 italic">Aguardando...</span>}</p>
          </div>
          <div>
            <span className="text-gray-500">Whatsapp:</span>
            <p className="text-gray-900">{workflow.contactWhatsapp || <span className="text-gray-400 italic">Aguardando...</span>}</p>
          </div>
        </div>
      </div>

      {!isLocked && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? 'Guardado!' : isSaving ? 'A guardar...' : 'Guardar Valor'}
          </button>
        </div>
      )}
    </div>
  );
}
