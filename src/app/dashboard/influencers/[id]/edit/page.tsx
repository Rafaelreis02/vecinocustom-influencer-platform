'use client';
import { useGlobalToast } from '@/contexts/ToastContext';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditInfluencerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    instagramHandle: '',
    instagramFollowers: '',
    tiktokHandle: '',
    tiktokFollowers: '',
    status: 'UNKNOWN',
    tier: 'micro',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    fetchInfluencer();
  }, []);

  const fetchInfluencer = async () => {
    try {
      const res = await fetch(`/api/influencers/${id}`);
      const data = await res.json();
      
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        instagramHandle: data.instagramHandle || '',
        instagramFollowers: data.instagramFollowers?.toString() || '',
        tiktokHandle: data.tiktokHandle || '',
        tiktokFollowers: data.tiktokFollowers?.toString() || '',
        status: data.status || 'UNKNOWN',
        tier: data.tier || 'micro',
        notes: data.notes || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });
    } catch (error) {
      console.error('Error fetching influencer:', error);
      addToast('Erro ao carregar influencer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/influencers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push(`/dashboard/influencers/${id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar influencer');
      }
    } catch (error) {
      console.error('Error updating influencer:', error);
      addToast('Erro ao atualizar influencer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/influencers/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Perfil
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Editar Influencer</h1>
        <p className="mt-1 text-sm text-gray-600">
          Atualiza os dados de {formData.name}
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
                <optgroup label="🔍 Prospeção">
                  <option value="UNKNOWN">Desconhecido</option>
                  <option value="SUGGESTION">Sugestão</option>
                  <option value="IMPORT_PENDING">A Importar</option>
                </optgroup>
                <optgroup label="💬 A Negociar">
                  <option value="ANALYZING">Em Análise</option>
                  <option value="COUNTER_PROPOSAL">Contraproposta</option>
                </optgroup>
                <optgroup label="✅ Em Curso">
                  <option value="AGREED">Acordado</option>
                  <option value="PRODUCT_SELECTION">Seleção Produto</option>
                  <option value="CONTRACT_PENDING">Contrato Pendente</option>
                  <option value="SHIPPED">Enviado</option>
                  <option value="COMPLETED">Concluído</option>
                </optgroup>
                <optgroup label="──────────">
                  <option value="CANCELLED">Cancelado</option>
                  <option value="BLACKLISTED">Bloqueado</option>
                </optgroup>
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
            href={`/dashboard/influencers/${id}`}
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
                Guardar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
