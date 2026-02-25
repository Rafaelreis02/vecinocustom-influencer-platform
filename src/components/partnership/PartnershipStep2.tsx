'use client';

import { useState } from 'react';
import { MapPin, Gift, Loader2, Check } from 'lucide-react';

interface PartnershipStep2Props {
  workflow: {
    shippingAddress: string | null;
    productSuggestion1: string | null;
    productSuggestion2: string | null;
    productSuggestion3: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep2({ workflow, onUpdate, isLocked }: PartnershipStep2Props) {
  const [formData, setFormData] = useState({
    shippingAddress: workflow.shippingAddress || '',
    productSuggestion1: workflow.productSuggestion1 || '',
    productSuggestion2: workflow.productSuggestion2 || '',
    productSuggestion3: workflow.productSuggestion3 || '',
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
    
    if (formData.shippingAddress) updates.shippingAddress = formData.shippingAddress;
    if (formData.productSuggestion1) updates.productSuggestion1 = formData.productSuggestion1;
    if (formData.productSuggestion2) updates.productSuggestion2 = formData.productSuggestion2;
    if (formData.productSuggestion3) updates.productSuggestion3 = formData.productSuggestion3;
    
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
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 2: Shipping</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-purple-600">Pelo influencer:</span> Morada completa + 3 sugestões de produtos
        </p>
      </div>

      {/* Morada */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Morada Completa <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <textarea
            value={formData.shippingAddress}
            onChange={(e) => handleChange('shippingAddress', e.target.value)}
            disabled={isLocked}
            placeholder="Rua, número, andar&#10;Código postal, Cidade&#10;País"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 resize-none"
          />
        </div>
      </div>

      {/* Sugestões de Produtos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-gray-500" />
          <label className="block text-sm font-medium text-gray-700">
            Sugestões de Produtos <span className="text-red-500">*</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          O influencer sugere 3 produtos que gostaria de receber
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sugestão 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.productSuggestion1}
              onChange={(e) => handleChange('productSuggestion1', e.target.value)}
              disabled={isLocked}
              placeholder="Ex: Pulseira Personalizada com Nome"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sugestão 2
            </label>
            <input
              type="text"
              value={formData.productSuggestion2}
              onChange={(e) => handleChange('productSuggestion2', e.target.value)}
              disabled={isLocked}
              placeholder="Ex: Anel de Prata Gravado"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sugestão 3
            </label>
            <input
              type="text"
              value={formData.productSuggestion3}
              onChange={(e) => handleChange('productSuggestion3', e.target.value)}
              disabled={isLocked}
              placeholder="Ex: Colar com Iniciais"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
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
            {saved ? 'Guardado!' : isSaving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}
