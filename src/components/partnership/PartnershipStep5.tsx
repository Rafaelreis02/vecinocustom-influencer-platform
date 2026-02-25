'use client';

import { useState } from 'react';
import { Truck, Ticket, CheckCircle2, Loader2, Check } from 'lucide-react';

interface PartnershipStep5Props {
  workflow: {
    trackingUrl: string | null;
    couponCode: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep5({ workflow, onUpdate, isLocked }: PartnershipStep5Props) {
  const [formData, setFormData] = useState({
    trackingUrl: workflow.trackingUrl || '',
    couponCode: workflow.couponCode || '',
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
    
    if (formData.trackingUrl) updates.trackingUrl = formData.trackingUrl;
    if (formData.couponCode) updates.couponCode = formData.couponCode;
    
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
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 5: Shipped</h4>
        <p className="text-sm text-gray-500">
          Produto enviado! Insere o tracking e o cupom do influencer.
        </p>
      </div>

      {/* Tracking URL */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          URL de Tracking <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="url"
            value={formData.trackingUrl}
            onChange={(e) => handleChange('trackingUrl', e.target.value)}
            disabled={isLocked}
            placeholder="https://ctt.pt/... ou https://dhl.com/..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <p className="text-xs text-gray-500">Link para acompanhar a encomenda (CTT, DHL, UPS, etc.)</p>
      </div>

      {/* Coupon Code */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Cupom do Influencer <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={formData.couponCode}
            onChange={(e) => handleChange('couponCode', e.target.value)}
            disabled={isLocked}
            placeholder="Ex: SOFIA20"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 uppercase"
          />
        </div>
        <p className="text-xs text-gray-500">Código de desconto exclusivo para os seguidores do influencer</p>
      </div>

      {/* Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-green-900">Quase lá!</h5>
            <p className="text-sm text-green-700 mt-1">
              Depois de inserir o tracking e o cupom, podes finalizar a parceria. 
              O influencer receberá um email com estas informações e fica à espera 
              do conteúdo publicado.
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
