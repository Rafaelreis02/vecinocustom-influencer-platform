'use client';

import { useState } from 'react';
import { Link2, Loader2, Check, Ticket, Percent } from 'lucide-react';

interface PartnershipStep3Props {
  workflow: {
    id: string;
    selectedProductUrl: string | null;
    couponCode: string | null;
  };
  influencer: {
    id: string;
    name: string;
    tiktokHandle?: string | null;
    instagramHandle?: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep3({ workflow, influencer, onUpdate, isLocked }: PartnershipStep3Props) {
  const [formData, setFormData] = useState({
    selectedProductUrl: workflow.selectedProductUrl || '',
    couponCode: workflow.couponCode || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [saved, setSaved] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const generateCouponCode = () => {
    const handle = influencer.tiktokHandle || influencer.instagramHandle || '';
    const cleanHandle = handle.replace('@', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = 'VECINO';
    const suffix = cleanHandle.substring(0, 8) || 'INF';
    return `${prefix}_${suffix}_10`;
  };

  const handleCreateCoupon = async () => {
    const code = formData.couponCode || generateCouponCode();
    
    setIsCreatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    
    try {
      // First save the coupon code to workflow
      const saveRes = await fetch(`/api/partnerships/${workflow.id}/coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code }),
      });
      
      if (!saveRes.ok) {
        const error = await saveRes.json();
        throw new Error(error.error || 'Failed to save coupon');
      }
      
      // Then create the coupon in Shopify
      const createRes = await fetch(`/api/influencers/${influencer.id}/create-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      const createData = await createRes.json();
      
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create coupon in Shopify');
      }
      
      setCouponSuccess(`Cupom ${code} criado com sucesso na Shopify!`);
      setFormData(prev => ({ ...prev, couponCode: code }));
      
      // Clear success message after 3 seconds
      setTimeout(() => setCouponSuccess(null), 3000);
      
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates: any = {};
    
    if (formData.selectedProductUrl) updates.selectedProductUrl = formData.selectedProductUrl;
    if (formData.couponCode) updates.couponCode = formData.couponCode;
    
    const success = await onUpdate(updates);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setIsSaving(false);
  };

  // Auto-generate coupon code if empty
  const suggestedCode = formData.couponCode || generateCouponCode();

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 3: Preparing</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-blue-600">Por nós (obrigatório para avançar):</span> Produto e cupom
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

      {/* Coupon Code Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="h-5 w-5 text-purple-600" />
          <h5 className="font-medium text-purple-900">Cupom de Desconto</h5>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <Percent className="h-4 w-4" />
          <span>10% de desconto + 20% comissão para o influencer</span>
        </div>

        {/* Coupon Code Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Código do Cupom <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.couponCode || suggestedCode}
              onChange={(e) => handleChange('couponCode', e.target.value.toUpperCase())}
              disabled={isLocked || !!workflow.couponCode}
              placeholder="VECINO_NOME_10"
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm font-mono uppercase focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
            {!isLocked && !workflow.couponCode && (
              <button
                onClick={() => handleChange('couponCode', generateCouponCode())}
                className="px-3 py-2 bg-white border border-purple-300 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition"
              >
                Gerar
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Sugestão: VECINO_ + nome do influencer + _10
          </p>
        </div>

        {/* Error/Success Messages */}
        {couponError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{couponError}</p>
          </div>
        )}
        {couponSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{couponSuccess}</p>
          </div>
        )}

        {/* Create Coupon Button */}
        {!isLocked && !workflow.couponCode && (
          <button
            onClick={handleCreateCoupon}
            disabled={isCreatingCoupon || !formData.couponCode}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreatingCoupon ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A criar na Shopify...
              </>
            ) : (
              <>
                <Ticket className="h-4 w-4" />
                Criar Cupom na Shopify
              </>
            )}
          </button>
        )}

        {/* Coupon Created Status */}
        {workflow.couponCode && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Cupom {workflow.couponCode} criado
              </p>
              <p className="text-xs text-green-700">
                Já está ativo na Shopify
              </p>
            </div>
          </div>
        )}
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
