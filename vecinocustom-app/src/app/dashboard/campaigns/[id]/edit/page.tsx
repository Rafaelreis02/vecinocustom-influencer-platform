'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Target,
  Calendar,
  DollarSign,
  Hash,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  hashtag: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  targetViews: number | null;
  targetSales: number | null;
  status: string;
}

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hashtag: '',
    startDate: '',
    endDate: '',
    budget: '',
    targetViews: '',
    targetSales: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${params.id}`);
      
      if (!res.ok) {
        throw new Error('Campanha não encontrada');
      }
      
      const campaign: Campaign = await res.json();
      
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        hashtag: campaign.hashtag || '',
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        budget: campaign.budget?.toString() || '',
        targetViews: campaign.targetViews?.toString() || '',
        targetSales: campaign.targetSales?.toString() || '',
        status: campaign.status,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push(`/dashboard/campaigns/${params.id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar campanha');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Erro ao atualizar campanha');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{error}</h3>
        <Link
          href="/dashboard/campaigns"
          className="text-purple-600 hover:text-purple-700"
        >
          Voltar às campanhas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href={`/dashboard/campaigns/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Detalhes
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Editar Campanha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Atualiza os detalhes e configurações da campanha
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="rounded-xl bg-white p-4 sm:p-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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

            {/* Hashtag */}
            <div>
              <label htmlFor="hashtag" className="block text-sm font-medium text-gray-700 mb-1">
                Hashtag de Tracking
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="hashtag"
                  name="hashtag"
                  value={formData.hashtag}
                  onChange={handleChange}
                  placeholder="vecinodiadosnamorados"
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Influencers que publicarem com esta hashtag serão automaticamente associados
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

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="status"
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              >
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
                <option value="COMPLETED">Concluída</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dates Card */}
        <div className="rounded-xl bg-white p-4 sm:p-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Datas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="rounded-xl bg-white p-4 sm:p-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Orçamento & Objetivos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
          <Link
            href={`/dashboard/campaigns/${params.id}`}
            className="px-4 py-2 rounded-md text-center text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving || !formData.name}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
