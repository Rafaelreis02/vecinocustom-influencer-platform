'use client';

import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface ImportHandleTabProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ImportHandleTab({ onSuccess, onClose }: ImportHandleTabProps) {
  const { addToast } = useGlobalToast();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    if (!handle.trim()) {
      addToast('Preenche o handle do TikTok', 'error');
      return;
    }

    const cleanHandle = handle.replace('@', '').trim();

    try {
      setLoading(true);
      setResult(null);

      const res = await fetch('/api/worker/analyze-influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          handle: cleanHandle,
          platform: 'TIKTOK'
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro na análise');
      }

      setResult(data);
      addToast(`✅ @${cleanHandle} analisado com sucesso!`, 'success');

      console.log('API Response:', data); // DEBUG

      // Criar o influencer na DB - COM TODOS OS CAMPOS!
      const createRes = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name || cleanHandle,
          tiktokHandle: `@${cleanHandle}`,
          tiktokFollowers: data.followers,
          totalLikes: data.totalLikes,           // NOVO!
          engagementRate: data.engagement,
          averageViews: data.averageViews,
          videoCount: data.videoCount,           // NOVO!
          estimatedPrice: data.estimatedPrice,
          fitScore: data.fitScore,
          niche: data.niche,
          tier: data.tier,
          biography: data.biography,
          avatarUrl: data.avatar,
          email: data.email,
          country: data.country,
          verified: data.verified,               // NOVO!
          language: data.language || 'Português',
          analysisSummary: data.summary,        // NOTAS!
          analysisDate: new Date().toISOString(), // NOVO!
          status: 'SUGGESTION',
        }),
      });

      if (createRes.ok) {
        addToast(`✅ @${cleanHandle} importado com sucesso!`, 'success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const error = await createRes.text();
        throw new Error(error);
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
        <p className="font-medium text-gray-700 mb-1">Importar Handle Específico</p>
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
              disabled={loading}
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
            <p><strong>Likes:</strong> {result.totalLikes?.toLocaleString()}</p>
            <p><strong>Vídeos:</strong> {result.videoCount}</p>
            <p><strong>Engagement:</strong> {result.engagement}%</p>
            <p><strong>Verificado:</strong> {result.verified ? 'Sim ✓' : 'Não'}</p>
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
        disabled={loading || !handle.trim()}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            A analisar...
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            Analisar e Importar
          </>
        )}
      </button>
    </div>
  );
}
