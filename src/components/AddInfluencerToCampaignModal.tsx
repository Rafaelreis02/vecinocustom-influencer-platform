'use client';

import { useState, useEffect } from 'react';
import { X, Users, DollarSign, Loader2, Search } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface AddInfluencerToCampaignModalProps {
  campaignId: string;
  campaignName: string;
  existingInfluencerIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Influencer {
  id: string;
  name: string;
  email: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  estimatedPrice: number | null;
}

export default function AddInfluencerToCampaignModal({
  campaignId,
  campaignName,
  existingInfluencerIds,
  isOpen,
  onClose,
  onSuccess,
}: AddInfluencerToCampaignModalProps) {
  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState('');
  const [agreedFee, setAgreedFee] = useState('');
  const [commissionRate, setCommissionRate] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchInfluencers();
    }
  }, [isOpen]);

  const fetchInfluencers = async () => {
    try {
      const res = await fetch('/api/influencers?status=working');
      if (res.ok) {
        const data = await res.json();
        // Filter out already added influencers
        const available = data.filter((inf: Influencer) => !existingInfluencerIds.includes(inf.id));
        setInfluencers(available);
      }
    } catch (error) {
      console.error('Error fetching influencers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInfluencerId) {
      addToast('Seleciona um influencer', 'info');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/influencers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId: selectedInfluencerId,
          agreedFee: agreedFee ? parseFloat(agreedFee) : null,
          commissionRate: commissionRate ? parseFloat(commissionRate) : null,
          status: 'confirmed',
        }),
      });

      if (res.ok) {
        addToast('Influencer adicionado com sucesso', 'success');
        setSelectedInfluencerId('');
        setAgreedFee('');
        setCommissionRate('');
        setSearchQuery('');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        addToast(data.error || 'Erro ao adicionar influencer', 'error');
      }
    } catch (error) {
      console.error('Error adding influencer:', error);
      addToast('Erro ao adicionar influencer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredInfluencers = influencers.filter(inf =>
    inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inf.instagramHandle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inf.tiktokHandle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedInfluencer = influencers.find(inf => inf.id === selectedInfluencerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Adicionar Influencer</h2>
            <p className="text-sm text-gray-600 mt-1">{campaignName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pesquisar Influencer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, @instagram, @tiktok..."
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Influencer List */}
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {filteredInfluencers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {influencers.length === 0 ? 'Todos os influencers já estão na campanha' : 'Nenhum influencer encontrado'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredInfluencers.map((inf) => (
                  <button
                    key={inf.id}
                    type="button"
                    onClick={() => {
                      setSelectedInfluencerId(inf.id);
                      if (inf.estimatedPrice) {
                        setAgreedFee(inf.estimatedPrice.toString());
                      }
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedInfluencerId === inf.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{inf.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {inf.instagramHandle && (
                            <span>📷 @{inf.instagramHandle} {inf.instagramFollowers && `(${(inf.instagramFollowers / 1000).toFixed(1)}K)`}</span>
                          )}
                          {inf.tiktokHandle && (
                            <span>@{inf.tiktokHandle} {inf.tiktokFollowers && `(${(inf.tiktokFollowers / 1000).toFixed(1)}K)`}</span>
                          )}
                        </div>
                      </div>
                      {inf.estimatedPrice && (
                        <div className="ml-4 text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">€{inf.estimatedPrice}</p>
                          <p className="text-xs text-gray-500">Estimado</p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Influencer Details */}
          {selectedInfluencer && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Termos do Acordo</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="agreedFee" className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Acordado (€)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      id="agreedFee"
                      min="0"
                      step="0.01"
                      value={agreedFee}
                      onChange={(e) => setAgreedFee(e.target.value)}
                      placeholder="250.00"
                      className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    id="commissionRate"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-md border border-gray-200 bg-white py-2 px-4 text-sm focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                * Campos opcionais - podem ser preenchidos mais tarde
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedInfluencerId}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A adicionar...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Adicionar à Campanha
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
