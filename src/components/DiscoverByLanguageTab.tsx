'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { startProcessing } from '@/components/ProcessingBanner';

interface DiscoverByLanguageTabProps {
  onSuccess: () => void;
  onClose: () => void;
}

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: '📱' },
  { id: 'instagram', name: 'Instagram', icon: '📸', disabled: true },
];

export function DiscoverByLanguageTab({ onSuccess, onClose }: DiscoverByLanguageTabProps) {
  const { addToast } = useGlobalToast();
  const [seed, setSeed] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [max, setMax] = useState(30);
  const [dryRun, setDryRun] = useState(false);

  const handleDiscover = () => {
    // Validar seed obrigatória
    if (!seed.trim()) {
      addToast('A seed é obrigatória. Insere um handle do TikTok.', 'error');
      return;
    }

    // Limpar seed (remover @ se existir)
    const cleanSeed = seed.trim().replace('@', '');

    // Iniciar processamento em background
    startProcessing(cleanSeed, max, platform, dryRun);
    
    addToast('🚀 Descoberta iniciada! Podes continuar a trabalhar.', 'success');
    
    // Fechar modal imediatamente
    onClose();
    
    // Chamar onSuccess para atualizar a lista
    if (onSuccess) {
      // Dar um delay para quando terminar, atualizar
      setTimeout(() => onSuccess(), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <p className="font-medium text-blue-800 mb-1">🧠 Descoberta Automática</p>
        <p>Insere uma conta seed do TikTok. A IA vai encontrar influencers similares entre quem essa conta segue.</p>
      </div>

      {/* Seed (OBRIGATÓRIA) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Conta Seed do TikTok * <span className="text-red-500">(obrigatório)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Ex: influencer_popular"
            className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Conta do TikTok que servirá de base para descobrir influencers similares entre quem ela segue
        </p>
      </div>

      {/* Plataforma */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Plataforma
        </label>
        <div className="flex gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => !p.disabled && setPlatform(p.id)}
              disabled={p.disabled}
              className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition ${
                platform === p.id 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              } ${p.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>{p.icon}</span>
              <span className="font-medium">{p.name}</span>
              {p.disabled && <span className="text-xs text-gray-400">(em breve)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Quantidade */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Quantidade a descobrir: <span className="text-blue-600 text-lg font-bold">{max}</span>
        </label>
        <input
          type="range"
          min="5"
          max="50"
          value={max}
          onChange={(e) => setMax(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5</span>
          <span>50</span>
        </div>
      </div>

      {/* Dry Run */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="dryRun"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="dryRun" className="text-sm text-gray-700 cursor-pointer">
          Modo teste (não insere na base de dados)
        </label>
      </div>

      {/* Botão */}
      <button
        onClick={handleDiscover}
        disabled={!seed.trim()}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        <Globe className="h-5 w-5" />
        {dryRun ? 'Testar Descoberta' : 'Iniciar Descoberta'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        💡 Podes continuar a trabalhar enquanto processa em segundo plano
      </p>
    </div>
  );
}