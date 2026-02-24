'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { startImportSingle } from '@/components/ProcessingBanner';

interface ImportHandleTabProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ImportHandleTab({ onSuccess, onClose }: ImportHandleTabProps) {
  const { addToast } = useGlobalToast();
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleImport = () => {
    if (!handle.trim()) {
      addToast('Preenche o handle do TikTok', 'error');
      return;
    }

    const cleanHandle = handle.replace('@', '').trim();

    // Iniciar import em background
    startImportSingle(cleanHandle);
    
    addToast('🚀 Importação iniciada! Podes continuar a trabalhar.', 'success');
    
    // Fechar modal imediatamente
    onClose();
    
    // Atualizar lista
    if (onSuccess) {
      setTimeout(() => onSuccess(), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <p className="font-medium text-gray-700 mb-1">📥 Importar Handle Específico</p>
        <p>Insere o @handle do TikTok e a IA vai buscar todos os dados automaticamente.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          TikTok Handle *
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="giuliaconti.ch"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Análise Completa
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Fit Score:</strong> {result.fitScore}/5</p>
            <p><strong>Nicho:</strong> {result.niche}</p>
            <p><strong>Preço Est.:</strong> {result.estimatedPrice}€</p>
            <p><strong>Seguidores:</strong> {result.followers?.toLocaleString()}</p>
            {result.summary && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p><strong>Notas da Análise:</strong></p>
                <p className="text-xs mt-1 whitespace-pre-wrap">{result.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!handle.trim()}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Search className="h-5 w-5" />
        Analisar e Importar
      </button>

      <p className="text-xs text-gray-500 text-center">
        💡 Podes continuar a trabalhar enquanto processa em segundo plano
      </p>
    </div>
  );
}