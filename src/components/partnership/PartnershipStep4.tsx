'use client';

import { useState } from 'react';
import { FileCheck, Link2, Loader2, Check } from 'lucide-react';

interface PartnershipStep4Props {
  workflow: {
    contractSigned: boolean;
    contractUrl: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep4({ workflow, onUpdate, isLocked }: PartnershipStep4Props) {
  const [formData, setFormData] = useState({
    contractSigned: workflow.contractSigned || false,
    contractUrl: workflow.contractUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, contractSigned: checked }));
    setSaved(false);
  };

  const handleUrlChange = (value: string) => {
    setFormData(prev => ({ ...prev, contractUrl: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates = {
      contractSigned: formData.contractSigned,
      contractUrl: formData.contractUrl || null,
    };
    
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
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 4: Contract</h4>
        <p className="text-sm text-gray-500">
          O influencer aceitou a prova e sabe o produto. Agora precisa de assinar o contrato.
        </p>
      </div>

      {/* Contract Signed Checkbox */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={formData.contractSigned}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              disabled={isLocked}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-900">
              Contrato Assinado <span className="text-red-500">*</span>
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Confirmo que o influencer assinou o contrato de parceria
            </span>
          </div>
        </label>
      </div>

      {/* Contract URL */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL do Contrato (Opcional)
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="url"
            value={formData.contractUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={isLocked}
            placeholder="https://drive.google.com/... ou https://docusign.com/..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <p className="text-xs text-gray-500">Link para o contrato assinado (Google Drive, DocuSign, etc.)</p>
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-gray-900">O que acontece depois?</h5>
            <p className="text-sm text-gray-500 mt-1">
              Após confirmar que o contrato foi assinado, poderás avançar para o último step 
              onde deverás enviar o tracking do produto e o cupom do influencer.
            </p>
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
