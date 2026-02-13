'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Calendar,
  Filter,
  DollarSign,
  Users,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  Download,
  Eye
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Influencer {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  paymentMethod: string | null;
}

interface Commission {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FAILED';
  paidAt: string | null;
  method: string;
  reference: string | null;
  createdAt: string;
  influencer: Influencer;
}

interface InfluencerSummary {
  influencer: Influencer;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  count: number;
}

interface Totals {
  total: number;
  pending: number;
  paid: number;
  count: number;
}

export default function CommissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useGlobalToast();

  // Estados
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [influencerSummaries, setInfluencerSummaries] = useState<InfluencerSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInfluencer, setExpandedInfluencer] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Carregar comissões
  useEffect(() => {
    loadCommissions();
  }, [startDate, endDate, statusFilter]);

  async function loadCommissions() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/commissions?${params.toString()}`);
      
      if (!res.ok) throw new Error('Erro ao carregar comissões');
      
      const data = await res.json();
      setCommissions(data.commissions || []);
      setInfluencerSummaries(data.influencerSummaries || []);
      setTotals(data.totals || null);

    } catch (error) {
      console.error('Error loading commissions:', error);
      addToast('Erro ao carregar comissões', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Aprovar/Pagar comissão
  async function handleApprove(commissionId: string) {
    try {
      setProcessingIds(prev => new Set(prev).add(commissionId));

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });

      if (!res.ok) throw new Error('Erro ao aprovar comissão');

      const data = await res.json();
      
      // Atualizar estado local
      setCommissions(prev => prev.map(c => 
        c.id === commissionId ? { ...c, status: 'PAID', paidAt: new Date().toISOString() } : c
      ));

      // Recarregar totais
      await loadCommissions();
      
      addToast('Comissão aprovada e marcada como paga', 'success');

    } catch (error) {
      console.error('Error approving commission:', error);
      addToast('Erro ao aprovar comissão', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(commissionId);
        return next;
      });
    }
  }

  // Rejeitar comissão
  async function handleReject(commissionId: string) {
    if (!window.confirm('Tens a certeza que queres rejeitar esta comissão?')) return;

    try {
      setProcessingIds(prev => new Set(prev).add(commissionId));

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (!res.ok) throw new Error('Erro ao rejeitar comissão');

      // Atualizar estado local
      setCommissions(prev => prev.map(c => 
        c.id === commissionId ? { ...c, status: 'CANCELLED' } : c
      ));

      // Recarregar totais
      await loadCommissions();
      
      addToast('Comissão rejeitada', 'success');

    } catch (error) {
      console.error('Error rejecting commission:', error);
      addToast('Erro ao rejeitar comissão', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(commissionId);
        return next;
      });
    }
  }

  // Toggle expandir influencer
  function toggleExpand(influencerId: string) {
    setExpandedInfluencer(expandedInfluencer === influencerId ? null : influencerId);
  }

  // Comissões de um influencer específico
  function getInfluencerCommissions(influencerId: string) {
    return commissions.filter(c => c.influencer.id === influencerId);
  }

  // Formatar moeda
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  // Formatar data
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-PT');
  }

  // Badge de status
  function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      PROCESSING: { label: 'Em Processamento', className: 'bg-blue-100 text-blue-800' },
      PAID: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
      FAILED: { label: 'Falhou', className: 'bg-gray-100 text-gray-800' },
    };

    const config = configs[status] || configs.PENDING;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  // Ícone de método de pagamento
  function PaymentMethodIcon({ method }: { method: string }) {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Banknote className="h-4 w-4" />;
      case 'PAYPAL':
        return <CreditCard className="h-4 w-4" />;
      case 'MBWAY':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  }

  if (loading && commissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestão de comissões e pagamentos aos influencers
          </p>
        </div>
        
        {/* Botão Filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {(startDate || endDate || statusFilter) && (
            <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data Inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="PAID">Pagas</option>
                <option value="CANCELLED">Rejeitadas</option>
                <option value="PROCESSING">Em Processamento</option>
              </select>
            </div>
          </div>

          {/* Limpar Filtros */}
          {(startDate || endDate || statusFilter) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setStatusFilter('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Cards de Resumo */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total em Comissões</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.pending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Já Pagas</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.paid)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Influencers com Comissões */}
      <div className="space-y-4">
        {influencerSummaries.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhuma comissão encontrada</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {commissions.length === 0 
                ? 'Ainda não existem comissões registadas.' 
                : 'Nenhuma comissão corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          influencerSummaries.map((summary) => {
            const isExpanded = expandedInfluencer === summary.influencer.id;
            const influencerCommissions = getInfluencerCommissions(summary.influencer.id);

            return (
              <div 
                key={summary.influencer.id} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Header do Influencer */}
                <button
                  onClick={() => toggleExpand(summary.influencer.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                      {summary.influencer.avatarUrl ? (
                        <img 
                          src={summary.influencer.avatarUrl} 
                          alt={summary.influencer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        summary.influencer.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{summary.influencer.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{summary.count} comissões</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <PaymentMethodIcon method={summary.influencer.paymentMethod || 'BANK_TRANSFER'} />
                          {summary.influencer.paymentMethod === 'MBWAY' ? 'MBWay' : 
                           summary.influencer.paymentMethod === 'PAYPAL' ? 'PayPal' : 'Transferência'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Totais */}
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                    </div>
                    
                    {summary.pendingAmount > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-yellow-600">Pendente</p>
                        <p className="font-bold text-yellow-700">{formatCurrency(summary.pendingAmount)}</p>
                      </div>
                    )}

                    <ChevronDown 
                      className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </button>

                {/* Detalhes das Comissões */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {influencerCommissions.map((commission) => (
                            <tr key={commission.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(commission.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {commission.description || 'Comissão'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(commission.amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <StatusBadge status={commission.status} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  {commission.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleApprove(commission.id)}
                                        disabled={processingIds.has(commission.id)}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                                        title="Aprovar e marcar como pago"
                                      >
                                        {processingIds.has(commission.id) ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleReject(commission.id)}
                                        disabled={processingIds.has(commission.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Rejeitar"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  {commission.status === 'PAID' && (
                                    <span className="text-xs text-green-600">
                                      Pago em {commission.paidAt && formatDate(commission.paidAt)}
                                    </span>
                                  )}
                                  {commission.status === 'CANCELLED' && (
                                    <span className="text-xs text-red-600">Rejeitado</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-gray-200">
                      {influencerCommissions.map((commission) => (
                        <div key={commission.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{formatDate(commission.createdAt)}</span>
                            <StatusBadge status={commission.status} />
                          </div>
                          <p className="text-sm text-gray-900">{commission.description || 'Comissão'}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(commission.amount)}
                            </span>
                            
                            {commission.status === 'PENDING' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(commission.id)}
                                  disabled={processingIds.has(commission.id)}
                                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
                                >
                                  {processingIds.has(commission.id) ? '...' : 'Aprovar'}
                                </button>
                                <button
                                  onClick={() => handleReject(commission.id)}
                                  disabled={processingIds.has(commission.id)}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer com total do influencer */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Total de {influencerCommissions.length} comissões
                        </span>
                        <Link
                          href={`/dashboard/influencers/${summary.influencer.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          Ver influencer <ArrowLeft className="h-3 w-3 rotate-180" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Componente Clock (faltava no import)
function Clock({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}
