'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Eye, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

// Mock data for commissions
const MOCK_INFLUENCERS = [
  {
    id: '1',
    name: 'João Silva',
    handle: '@joao_silva',
    cupomCode: 'VECINO_JOAO_10',
    commission: 10,
    totalValue: 450.50,
    salesCount: 15,
    orders: [
      { id: 'o1', date: '2026-02-09', customer: 'Cliente A', amount: 85.00, commission: 8.50, status: 'pending' },
      { id: 'o2', date: '2026-02-08', customer: 'Cliente B', amount: 120.00, commission: 12.00, status: 'pending' },
      { id: 'o3', date: '2026-02-07', customer: 'Cliente C', amount: 95.50, commission: 9.55, status: 'pending' },
      { id: 'o4', date: '2026-02-06', customer: 'Cliente D', amount: 150.00, commission: 15.00, status: 'pending' },
    ],
  },
  {
    id: '2',
    name: 'Maria Costa',
    handle: '@maria_costa',
    cupomCode: 'VECINO_MARIA_10',
    commission: 10,
    totalValue: 820.75,
    salesCount: 28,
    orders: [
      { id: 'o5', date: '2026-02-09', customer: 'Cliente E', amount: 200.00, commission: 20.00, status: 'pending' },
      { id: 'o6', date: '2026-02-08', customer: 'Cliente F', amount: 180.00, commission: 18.00, status: 'pending' },
      { id: 'o7', date: '2026-02-07', customer: 'Cliente G', amount: 250.00, commission: 25.00, status: 'pending' },
    ],
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    handle: '@pedro_oliveira',
    cupomCode: 'VECINO_PEDRO_10',
    commission: 10,
    totalValue: 320.00,
    salesCount: 9,
    orders: [
      { id: 'o8', date: '2026-02-09', customer: 'Cliente H', amount: 110.00, commission: 11.00, status: 'pending' },
      { id: 'o9', date: '2026-02-08', customer: 'Cliente I', amount: 210.00, commission: 21.00, status: 'pending' },
    ],
  },
];

export default function CommissionsPage() {
  const [expandedInfluencer, setExpandedInfluencer] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const handleExpandInfluencer = (influencerId: string) => {
    const influencer = MOCK_INFLUENCERS.find((i) => i.id === influencerId);
    if (influencer) {
      setOrders(influencer.orders);
      setExpandedInfluencer(expandedInfluencer === influencerId ? null : influencerId);
    }
  };

  const handleApproveOrder = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: 'approved' } : order
      )
    );
  };

  const handleRejectOrder = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: 'rejected' } : order
      )
    );
  };

  const totalCommission = MOCK_INFLUENCERS.reduce((sum, inf) => sum + inf.totalValue, 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>💰 Comissões - Fevereiro 2026</h1>
        <div className={styles.total}>
          <p className={styles.totalLabel}>Total a Pagar</p>
          <p className={styles.totalAmount}>€{totalCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Influencers</p>
          <p className={styles.summaryValue}>{MOCK_INFLUENCERS.length}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total Encomendas</p>
          <p className={styles.summaryValue}>
            {MOCK_INFLUENCERS.reduce((sum, inf) => sum + inf.salesCount, 0)}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Comissão Média</p>
          <p className={styles.summaryValue}>
            €{(totalCommission / MOCK_INFLUENCERS.length).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Commissions List */}
      <div className={styles.list}>
        {MOCK_INFLUENCERS.map((influencer) => (
          <div key={influencer.id} className={styles.card}>
            {/* Influencer Summary */}
            <button
              onClick={() => handleExpandInfluencer(influencer.id)}
              className={styles.cardHeader}
            >
              <div className={styles.cardInfo}>
                <div>
                  <h3 className={styles.cardName}>{influencer.name}</h3>
                  <p className={styles.cardHandle}>{influencer.handle}</p>
                </div>
              </div>

              <div className={styles.cardStats}>
                <div>
                  <p className={styles.statLabel}>Cupom</p>
                  <p className={styles.statValue}>{influencer.cupomCode}</p>
                </div>
                <div className={styles.statRight}>
                  <p className={styles.statLabel}>Encomendas</p>
                  <p className={styles.statValue}>{influencer.salesCount}</p>
                </div>
                <div className={styles.statRight}>
                  <p className={styles.statLabel}>Comissão Total</p>
                  <p className={styles.statValueHighlight}>€{influencer.totalValue.toFixed(2)}</p>
                </div>
              </div>

              <ChevronDown
                className={`${styles.chevron} ${
                  expandedInfluencer === influencer.id ? styles.chevronOpen : ''
                }`}
              />
            </button>

            {/* Orders Detail */}
            {expandedInfluencer === influencer.id && (
              <div className={styles.cardDetails}>
                <div className={styles.ordersTable}>
                  <div className={styles.tableHeader}>
                    <div>Data</div>
                    <div>Cliente</div>
                    <div>Valor</div>
                    <div>Comissão</div>
                    <div style={{ textAlign: 'center' }}>Ação</div>
                  </div>

                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`${styles.tableRow} ${
                        order.status === 'approved'
                          ? styles.tableRowApproved
                          : order.status === 'rejected'
                          ? styles.tableRowRejected
                          : ''
                      }`}
                    >
                      <div className={styles.tableCell}>
                        {new Date(order.date).toLocaleDateString('pt-PT')}
                      </div>
                      <div className={styles.tableCell}>{order.customer}</div>
                      <div className={styles.tableCell}>€{order.amount.toFixed(2)}</div>
                      <div className={`${styles.tableCell} ${styles.commission}`}>
                        €{order.commission.toFixed(2)}
                      </div>
                      <div className={styles.actions}>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              className={styles.btnApprove}
                              title="Aprovar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className={styles.btnReject}
                              title="Rejeitar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'approved' && (
                          <span className={styles.badge + ' ' + styles.badgeApproved}>
                            ✓ Aprovada
                          </span>
                        )}
                        {order.status === 'rejected' && (
                          <span className={styles.badge + ' ' + styles.badgeRejected}>
                            ✗ Rejeitada
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.ordersSummary}>
                  <div>
                    <p className={styles.summaryLabel}>Total Encomendas</p>
                    <p className={styles.summaryValue}>€{orders.reduce((sum, o) => sum + o.amount, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={styles.summaryLabel}>Total Comissão</p>
                    <p className={styles.summaryValueHighlight}>€{orders.reduce((sum, o) => sum + o.commission, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={styles.summaryLabel}>Aprovadas</p>
                    <p className={styles.summaryValue}>
                      {orders.filter((o) => o.status === 'approved').length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className={styles.note}>
        <p>
          💡 Clica em cada influencer para ver os detalhes das encomendas. Aprova ou rejeita com base no
          cupom usado.
        </p>
      </div>
    </div>
  );
}
