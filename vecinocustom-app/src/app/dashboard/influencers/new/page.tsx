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
  Loader2
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
    status: 'suggestion',
    tier: 'micro',
    notes: '',
    tags: '',
  });

  const [saving, setSaving] = useState(false);

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
    <div className="max-w-3xl space-y-6">
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
          Preenche os dados do novo influencer
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informação Básica</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
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
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
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
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="Lisboa, Portugal"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociais</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Handle
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    placeholder="@username"
                  />
                </div>
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
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="10000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok Handle
                </label>
                <input
                  type="text"
                  name="tiktokHandle"
                  value={formData.tiktokHandle}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="@username"
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
                  className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="50000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status & Classification */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Classificação</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="suggestion">Sugestão</option>
                <option value="negotiating">Em Negociação</option>
                <option value="working">A Trabalhar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier
              </label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="micro">Micro (1K-100K)</option>
                <option value="macro">Macro (100K-1M)</option>
                <option value="mega">Mega (1M+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes & Tags */}
        <div className="rounded-lg bg-white p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas & Tags</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Internas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                placeholder="Adiciona notas sobre este influencer..."
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
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                placeholder="Lifestyle, Fashion, Beauty"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/influencers"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
