'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  Loader2,
  Sparkles,
  Search,
  TrendingUp,
  DollarSign,
  Star,
  Globe,
  Tag
} from 'lucide-react';

export default function NewInfluencerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    instagramHandle: '',
    instagramFollowers: '',
    tiktokHandle: '',
    tiktokFollowers: '',
    youtubeHandle: '',
    youtubeFollowers: '',
    
    // Metrics
    engagementRate: '',
    averageViews: '',
    contentStability: 'MEDIUM',
    totalLikes: '',
    
    // Demographics
    country: '',
    language: 'PT',
    niche: '',
    contentTypes: '',
    primaryPlatform: 'TikTok',
    
    // Business
    status: 'suggestion',
    tier: 'micro',
    fitScore: '3',
    estimatedPrice: '',
    
    notes: '',
    tags: '',
  });

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importHandle, setImportHandle] = useState('');
  const [importPlatform, setImportPlatform] = useState('tiktok');

  const handleImport = async () => {
    if (!importHandle) return;
    setImporting(true);

    try {
      // Cria registo pendente para o Agente processar
      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: importHandle, // Nome temporário
          tiktokHandle: importPlatform === 'tiktok' ? importHandle : '',
          instagramHandle: importPlatform === 'instagram' ? importHandle : '',
          status: 'IMPORT_PENDING',
          notes: 'Aguardando processamento automático pelo Agente...'
        }),
      });

      if (res.ok) {
        alert('✅ Pedido enviado! O Agente vai processar este perfil em breve (aprox 30s). Podes ver o progresso na lista de influencers.');
        router.push('/dashboard/influencers');
      } else {
        alert('Erro ao agendar importação.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Erro ao agendar importação.');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/dashboard/influencers');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar influencer');
      }
    } catch (error) {
      console.error('Error creating influencer:', error);
      alert('Erro ao criar influencer');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/influencers"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Influencers
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Adicionar Influencer</h1>
        <p className="mt-1 text-sm text-gray-600">
          Preenche os dados completos do novo influencer.
        </p>
      </div>

      {/* AI Import Callout */}
      <div className="rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 p-6 border border-purple-800 shadow-lg text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              Importação Inteligente
            </h3>
            <p className="text-purple-200 text-sm mb-4">
              Escreve o @handle e a IA vai pesquisar métricas, biografia e dados automaticamente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                <input
                  type="text"
                  value={importHandle}
                  onChange={(e) => setImportHandle(e.target.value)}
                  placeholder="tiktok_handle"
                  className="w-full rounded-lg border-0 bg-white/10 text-white placeholder:text-gray-400 py-3 pl-8 pr-4 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none backdrop-blur-sm"
                />
              </div>
              <select
                value={importPlatform}
                onChange={(e) => setImportPlatform(e.target.value)}
                className="rounded-lg border-0 bg-white/10 text-white py-3 px-4 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none backdrop-blur-sm [&>option]:text-black"
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importHandle}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-900 rounded-lg text-sm font-bold hover:bg-purple-50 transition disabled:opacity-50 shadow-md whitespace-nowrap"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A Analisar...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Analisar e Importar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-400" />
            Informação Básica
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="Ex: Bárbara Vasconcelos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="+351..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="Portugal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="PT">Português</option>
                <option value="ES">Espanhol</option>
                <option value="EN">Inglês</option>
                <option value="FR">Francês</option>
              </select>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Instagram className="h-5 w-5 text-gray-400" />
            Redes Sociais
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok Handle (@)
                </label>
                <input
                  type="text"
                  name="tiktokHandle"
                  value={formData.tiktokHandle}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok Followers
                </label>
                <input
                  type="number"
                  name="tiktokFollowers"
                  value={formData.tiktokFollowers}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Handle (@)
                </label>
                <input
                  type="text"
                  name="instagramHandle"
                  value={formData.instagramHandle}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Followers
                </label>
                <input
                  type="number"
                  name="instagramFollowers"
                  value={formData.instagramFollowers}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics & Performance */}
        <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            Métricas & Performance (Obrigatório para Working)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engagement Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                name="engagementRate"
                value={formData.engagementRate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="4.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Average Views
              </label>
              <input
                type="text"
                name="averageViews"
                value={formData.averageViews}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="10K-50K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Stability
              </label>
              <select
                name="contentStability"
                value={formData.contentStability}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="HIGH">Alta (Consistente)</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa (Viral hit)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Likes
              </label>
              <input
                type="number"
                name="totalLikes"
                value={formData.totalLikes}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="1000000"
              />
            </div>
          </div>
        </div>

        {/* Business & Classification */}
        <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            Negócio & Classificação
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="suggestion">Sugestão</option>
                <option value="negotiating">Em Negociação</option>
                <option value="working">A Trabalhar</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fit Score (1-5)
              </label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="5"
                  name="fitScore"
                  value={formData.fitScore}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço Estimado (€)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="estimatedPrice"
                  value={formData.estimatedPrice}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="150"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier
              </label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="nano">Nano (1K-10K)</option>
                <option value="micro">Micro (10K-100K)</option>
                <option value="macro">Macro (100K-1M)</option>
                <option value="mega">Mega (1M+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-400" />
            Conteúdo & Notas
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nicho
                </label>
                <input
                  type="text"
                  name="niche"
                  value={formData.niche}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="Fashion, Lifestyle"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipos de Conteúdo
                </label>
                <input
                  type="text"
                  name="contentTypes"
                  value={formData.contentTypes}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                  placeholder="Hauls, Unboxings, GRWM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Internas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="Detalhes sobre a estratégia, pontos fortes, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="portugal, joias, gold, summer"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard/influencers"
            className="flex items-center gap-2 px-6 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Influencer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
