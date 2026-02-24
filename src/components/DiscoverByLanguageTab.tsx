'use client';

import { useState } from 'react';
import { Globe, Loader2, Sparkles, Smartphone } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDiscover = async () => {
    // Validar seed obrigatória
    if (!seed.trim()) {
      addToast('A seed é obrigatória. Insere um handle do TikTok.', 'error');
      return;
    }

    // Limpar seed (remover @ se existir)
    const cleanSeed = seed.trim().replace('@', '');

    try {
      setLoading(true);
      setResult(null);

      addToast('🔄 A iniciar descoberta...', 'info');

      const res = await fetch('/api/prospector/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: cleanSeed,
          platform,
          max,
          dryRun
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error(`Server returned non-JSON response (status ${res.status}). Check server logs.`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Erro na execução');
      }

      setResult(data);
      
      // Mostrar mensagem clara sobre quantos foram encontrados vs pedidos
      const requested = data.requested || max;
      const imported = data.stats?.imported || 0;
      
      if (dryRun) {
        addToast('✅ Teste concluído! Verifica o output.', 'success');
      } else if (imported >= requested) {
        addToast(`✅ ${imported} influencers bons encontrados (de ${requested} pedidos)!`, 'success');
      } else {
        addToast(`⚠️ Só ${imported} influencers bons encontrados de ${requested} pedidos.`, 'info');
      }
      
      if (imported > 0 && !dryRun) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      }
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
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
            disabled={loading}
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
              disabled={p.disabled || loading}
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
          disabled={loading}
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
          disabled={loading}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="dryRun" className="text-sm text-gray-700 cursor-pointer">
          Modo teste (não insere na base de dados)
        </label>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`border rounded-lg p-4 space-y-2 ${
          result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`font-semibold text-sm flex items-center gap-2 ${
            result.success ? 'text-green-900' : 'text-red-900'
          }`}>
            <Sparkles className="h-4 w-4" />
            {result.success ? 'Concluído!' : 'Erro'}
          </h3>
          
          {result.stats && (
            <div className="text-sm space-y-1">
              {result.requested && (
                <div className="flex justify-between font-semibold text-blue-700 border-b border-blue-200 pb-1 mb-2">
                  <span>Pedidos:</span>
                  <span>{result.requested}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Seed:</span>
                <span className="font-medium">@{result.stats.seed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total following:</span>
                <span className="font-medium">{result.stats.totalFollowing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filtrados (5k-150k):</span>
                <span className="font-medium">{result.stats.filteredByFollowers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processados:</span>
                <span className="font-medium">{result.stats.processed}</span>
              </div>
              <div className={`flex justify-between font-semibold border-t pt-1 mt-1 ${
                result.stats.imported >= (result.requested || max) 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                <span>Importados:</span>
                <span>{result.stats.imported} {result.requested ? `/ ${result.requested}` : ''}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>API calls:</span>
                <span>{result.stats.apiCalls}</span>
              </div>
              <div className="flex justify-between text-green-600 text-xs">
                <span>Calls poupados:</span>
                <span>{result.stats.apiCallsSaved}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleDiscover}
        disabled={loading || !seed.trim()}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg disabled:opacity--blue-700 transition50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            A processar... (pode demorar vários minutos)
          </>
        ) : (
          <>
            <Globe className="h-5 w-5" />
            {dryRun ? 'Testar Descoberta' : 'Iniciar Descoberta'}
          </>
        )}
      </button>

      {loading && (
        <p className="text-xs text-gray-500 text-center">
          ⏳ Isto pode demorar 5-15 minutos. Não feches esta janela!
        </p>
      )}
    </div>
  );
}
