'use client';

import { useState } from 'react';
import { Mail, Instagram, Phone, Euro, Loader2, Check } from 'lucide-react';

interface PartnershipStep1Props {
  workflow: {
    agreedPrice: number | null;
    contactEmail: string | null;
    contactInstagram: string | null;
    contactWhatsapp: string | null;
  };
  onUpdate: (updates: any) => Promise<boolean>;
  isLocked: boolean;
}

export function PartnershipStep1({ workflow, onUpdate, isLocked }: PartnershipStep1Props) {
  const [formData, setFormData] = useState({
    agreedPrice: workflow.agreedPrice?.toString() || '',
    contactEmail: workflow.contactEmail || '',
    contactInstagram: workflow.contactInstagram || '',
    contactWhatsapp: workflow.contactWhatsapp || '',
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
    if (formData.contactEmail) updates.contactEmail = formData.contactEmail;
    if (formData.contactInstagram) updates.contactInstagram = formData.contactInstagram;
    if (formData.contactWhatsapp) updates.contactWhatsapp = formData.contactWhatsapp;
    
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
          <span className="font-medium text-blue-600">Por nós:</span> Valor (pode ser 0€) | 
          <span className="font-medium text-purple-600"> Pelo influencer:</span> Email, Instagram, Whatsapp
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Valor Acordado */}
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

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              disabled={isLocked}
              placeholder="email@exemplo.com"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Instagram <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.contactInstagram}
              onChange={(e) => handleChange('contactInstagram', e.target.value)}
              disabled={isLocked}
              placeholder="@username"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Whatsapp */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Whatsapp <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={formData.contactWhatsapp}
              onChange={(e) => handleChange('contactWhatsapp', e.target.value)}
              disabled={isLocked}
              placeholder="+351 912 345 678"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
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
