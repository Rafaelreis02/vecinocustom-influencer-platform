'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGlobalToast } from '@/contexts/ToastContext';
import styles from './page.module.css';

interface Coupon {
  id: string;
  code: string;
  discountValue: number;
  discountType: string;
  influencer?: {
    id: string;
    name: string;
    tiktokHandle?: string;
    instagramHandle?: string;
  };
  usageCount: number;
  totalSales: number;
  validUntil?: string;
  createdAt: string;
  shopifyId?: string;
}

interface Influencer {
  id: string;
  name: string;
  tiktokHandle?: string;
  instagramHandle?: string;
}

export default function CouponsPage() {
  const { addToast } = useGlobalToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discountValue: 10,
    influencerId: '',
    validUntil: '',
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Load coupons
      const couponsRes = await fetch('/api/coupons');
      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setCoupons(data.coupons || []);
      }

      // Load influencers
      const influencersRes = await fetch('/api/influencers');
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setInfluencers(data.influencers || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.code.trim() || !formData.influencerId) {
      addToast('Preenche todos os campos obrigatórios', 'error');
      return;
    }

    try {
      setCreating(true);

      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cupom');
      }

      // Add to list
      setCoupons([data.coupon, ...coupons]);

      // Reset form
      setFormData({
        code: '',
        discountValue: 10,
        influencerId: '',
        validUntil: '',
      });
      setShowForm(false);

      addToast(`Cupom ${data.coupon.code} criado com sucesso`, 'success');
    } catch (error) {
      console.error('Error creating coupon:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao criar cupom',
        'error'
      );
    } finally {
      setCreating(false);
    }
  }

  const getInfluencerName = (id: string) => {
    const inf = influencers.find((i) => i.id === id);
    return inf?.name || 'Desconhecido';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cupões</h1>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✖️ Cancelar' : '➕ Novo Cupom'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className={styles.formCard}>
          <h2>Criar Novo Cupom</h2>
          <form onSubmit={handleCreateCoupon}>
            <div className={styles.formGroup}>
              <label htmlFor="code">Código do Cupom *</label>
              <input
                id="code"
                type="text"
                placeholder="Ex: VECINO_JOÃO_10"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                disabled={creating}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="discount">Desconto (%) *</label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountValue: parseInt(e.target.value),
                    })
                  }
                  disabled={creating}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="influencer">Influenciador *</label>
                <select
                  id="influencer"
                  value={formData.influencerId}
                  onChange={(e) =>
                    setFormData({ ...formData, influencerId: e.target.value })
                  }
                  disabled={creating}
                >
                  <option value="">Seleciona um influenciador</option>
                  {influencers.map((inf) => (
                    <option key={inf.id} value={inf.id}>
                      {inf.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="validUntil">Data de Expiração (opcional)</label>
              <input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
                disabled={creating}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={creating}
            >
              {creating ? 'Criando...' : 'Criar Cupom'}
            </button>
          </form>
        </div>
      )}

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhum cupom criado ainda</p>
          <p>Clica em &quot;Novo Cupom&quot; para começar</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {coupons.map((coupon) => (
            <div key={coupon.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{coupon.code}</h3>
                <span className={styles.discount}>{coupon.discountValue}%</span>
              </div>

              <div className={styles.cardBody}>
                <p>
                  <strong>Influenciador:</strong>{' '}
                  {coupon.influencer?.name ||
                    getInfluencerName(coupon.influencer?.id || '')}
                </p>
                <p>
                  <strong>Usos:</strong> {coupon.usageCount}
                </p>
                <p>
                  <strong>Vendas:</strong> €{coupon.totalSales.toFixed(2)}
                </p>
                {coupon.validUntil && (
                  <p>
                    <strong>Expira em:</strong>{' '}
                    {new Date(coupon.validUntil).toLocaleDateString('pt-PT')}
                  </p>
                )}
              </div>

              {coupon.shopifyId && (
                <div className={styles.badge}>Ativo na Shopify</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
