'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Target,
  Calendar,
  DollarSign,
  Hash,
  FileText,
} from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'TIKTOK',
    hashtag: '',
    startDate: '',
    endDate: '',
    budget: '',
    targetViews: '',
    targetSales: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'DRAFT',
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        router.push(`/dashboard/campaigns/${campaign.id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar campanha');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às Campanhas
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Nova Campanha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cria uma nova campanha e associa influencers automaticamente via hashtag
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Informação Básica
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Campanha *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Dia dos Namorados 2026"
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Platform */}
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                Plataforma *
              </label>
              <select
                id="platform"
                name="platform"
                required
                value={formData.platform}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="TIKTOK">TikTok</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="OTHER">Outro</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Plataforma onde os vídeos serão publicados
              </p>
            </div>

            {/* Hashtag */}
            <div>
              <label htmlFor="hashtag" className="block text-sm font-medium text-gray-700 mb-1">
                Hashtag de Tracking *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="hashtag"
                  name="hashtag"
                  required
                  value={formData.hashtag}
                  onChange={handleChange}
                  placeholder="vecinodiadosnamorados"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Todos os vídeos com esta hashtag aparecerão automaticamente nesta campanha
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreve os objetivos e detalhes da campanha..."
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Dates Card */}
        <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Datas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Fim
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Budget & Goals Card */}
        <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Orçamento & Objetivos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Orçamento (€)
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={handleChange}
                placeholder="5000"
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Target Views */}
            <div>
              <label htmlFor="targetViews" className="block text-sm font-medium text-gray-700 mb-1">
                Meta de Views
              </label>
              <input
                type="number"
                id="targetViews"
                name="targetViews"
                min="0"
                value={formData.targetViews}
                onChange={handleChange}
                placeholder="1000000"
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Target Sales */}
            <div>
              <label htmlFor="targetSales" className="block text-sm font-medium text-gray-700 mb-1">
                Meta de Vendas
              </label>
              <input
                type="number"
                id="targetSales"
                name="targetSales"
                min="0"
                value={formData.targetSales}
                onChange={handleChange}
                placeholder="100"
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/dashboard/campaigns"
            className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A criar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Criar Campanha
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
