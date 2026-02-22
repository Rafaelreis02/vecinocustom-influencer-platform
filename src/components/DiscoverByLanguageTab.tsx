'use client';

import { useState } from 'react';
import { Globe, Loader2, Users, Sparkles } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface DiscoverByLanguageTabProps {
  onSuccess: () => void;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'PT', name: 'Português', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanhol', flag: '🇪🇸' },
  { code: 'EN', name: 'Inglês', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemão', flag: '🇩🇪' },
  { code: 'FR', name: 'Francês', flag: '🇫🇷' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
];

export function DiscoverByLanguageTab({ onSuccess, onClose }: DiscoverByLanguageTabProps) {
  const { addToast } = useGlobalToast();
  const [language, setLanguage] = useState('PT');
  const [seed, setSeed] = useState('');
  const [max, setMax] = useState(20);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDiscover = async () => {
    try {
      setLoading(true);
      setResult(null);

      addToast('🔄 A iniciar descoberta...', 'info');

      const res = await fetch('/api/prospector/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          max,
          seed: seed.trim() || undefined,
          dryRun
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Erro na execução');
      }

      setResult(data);
      
      if (dryRun) {
        addToast('✅ Teste concluído! Verifica o output.', 'success');
      } else {
        const imported = data.stats?.Importados || 'vários';
        addToast(`✅ ${imported} influencers descobertos e importados!`, 'success');
        
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <p className="font-medium text-gray-700 mb-1">Descobrir por Idioma</p>
        <p>A IA vai encontrar até {max} influencers automáticos baseados numa semente do idioma selecionado.</p>
      </div>

      {/* Idioma */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Idioma *
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Semente (opcional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Semente (opcional)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Deixa vazio para escolha automática"
            disabled={loading}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Se especificares uma semente, a IA procura influencers similares a essa conta.
        </p>
      </div>

      {/* Quantidade */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Máximo de Influencers: <span className="text-blue-600">{max}</span>
        </label>
        <input
          type="range"
          min="3"
          max="50"
          value={max}
          onChange={(e) => setMax(parseInt(e.target.value))}
          disabled={loading}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>3</span>
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
              {Object.entries(result.stats).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
          
          {dryRun && result.output && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Output (últimas linhas):</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {result.output.slice(-500)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleDiscover}
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
