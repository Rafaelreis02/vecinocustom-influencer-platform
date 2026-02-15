'use client';

import { useState } from 'react';
import { X, Plus, Loader2, Sparkles } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProspectModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProspectModalProps) {
  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    tiktokHandle: '',
    tiktokFollowers: '',
    country: '',
    language: 'Português',
    engagementRate: '',
    niche: '',
  });

  const [analysis, setAnalysis] = useState<any>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnalyzeWithGemini = async () => {
    if (!formData.name || !formData.tiktokHandle || !formData.country) {
      addToast('Preenche Name, Handle e País para análise', 'error');
      return;
    }

    try {
      setAnalyzing(true);
      const res = await fetch('/api/influencers/add-prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro na análise');
      }

      setAnalysis(data.analysis);
      addToast(`✅ ${data.message}`, 'success');
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1500);
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tiktokHandle: '',
      tiktokFollowers: '',
      country: '',
      language: 'Português',
      engagementRate: '',
      niche: '',
    });
    setAnalysis(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Adicionar Prospect</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ex: Giulia Conti"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* TikTok Handle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              TikTok Handle *
            </label>
            <input
              type="text"
              name="tiktokHandle"
              value={formData.tiktokHandle}
              onChange={handleChange}
              placeholder="ex: @giuliaconti.ch"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Seguidores */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seguidores
            </label>
            <input
              type="number"
              name="tiktokFollowers"
              value={formData.tiktokFollowers}
              onChange={handleChange}
              placeholder="ex: 28000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              País *
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Seleciona país</option>
              <option value="Itália">Itália</option>
              <option value="Espanha">Espanha</option>
              <option value="Portugal">Portugal</option>
              <option value="Holanda">Holanda</option>
              <option value="França">França</option>
              <option value="Alemanha">Alemanha</option>
              <option value="UK">UK</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Idioma
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Português">Português</option>
              <option value="Italiano">Italiano</option>
              <option value="Espanhol">Espanhol</option>
              <option value="Inglês">Inglês</option>
              <option value="Francês">Francês</option>
              <option value="Alemão">Alemão</option>
            </select>
          </div>

          {/* Engagement */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Engagement (%)
            </label>
            <input
              type="number"
              name="engagementRate"
              value={formData.engagementRate}
              onChange={handleChange}
              placeholder="ex: 6.8"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Nicho */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nicho
            </label>
            <input
              type="text"
              name="niche"
              value={formData.niche}
              onChange={handleChange}
              placeholder="ex: Fashion/Lifestyle"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm text-blue-900">
                Análise Gemini 3-Flash
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>Recomendação:</strong> {analysis.recommendation}
                </p>
                <p>
                  <strong>Preço Est.:</strong> {analysis.estimatedPrice}€
                </p>
                <p>
                  <strong>Risco:</strong> {analysis.risk}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={analyzing || loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAnalyzeWithGemini}
            disabled={analyzing || loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {analyzing || loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Análise + Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
