'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  X,
  Calendar,
  DollarSign,
  Target
} from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    targetViews: '',
    targetSales: '',
    status: 'draft',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Guardar na BD
    console.log('Nova campanha:', formData);
    router.push('/dashboard/campaigns');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às Campanhas
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Nova Campanha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cria uma nova campanha de influencers
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informação Básica</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Campanha *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                placeholder="Ex: Valentine's Day 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                placeholder="Descreve os objetivos e detalhes da campanha..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="draft">Rascunho</option>
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Início *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Fim
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Budget & Goals */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget & Objetivos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget (€)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Views
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="targetViews"
                  value={formData.targetViews}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="1000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Sales
              </label>
              <input
                type="number"
                name="targetSales"
                value={formData.targetSales}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/campaigns"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Save className="h-4 w-4" />
            Criar Campanha
          </button>
        </div>
      </form>
    </div>
  );
}
