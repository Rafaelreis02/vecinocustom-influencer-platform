'use client';

import { useState } from 'react';
import { Link2, Loader2, Check } from 'lucide-react';

interface PartnershipStep3Props {
  workflow: {
    selectedProductUrl: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep3({ workflow, onUpdate, isLocked }: PartnershipStep3Props) {
  const [formData, setFormData] = useState({
    selectedProductUrl: workflow.selectedProductUrl || '',
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
    
    if (formData.selectedProductUrl) updates.selectedProductUrl = formData.selectedProductUrl;
    
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
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 3: Preparing</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-blue-600">Por nós (obrigatório para avançar):</span> URL do produto escolhido
        </p>
      </div>

      {/* URL Produto Escolhido */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL do Produto Escolhido <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="url"
            value={formData.selectedProductUrl}
            onChange={(e) => handleChange('selectedProductUrl', e.target.value)}
            disabled={isLocked}
            placeholder="https://vecinocustom.com/produto/..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <p className="text-xs text-gray-500">Link do produto selecionado na Shopify</p>
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
