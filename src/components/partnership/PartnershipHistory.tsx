'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Calendar, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';

interface PartnershipHistoryProps {
  partnerships: Array<{
    id: string;
    currentStep: number;
    status: string;
    agreedPrice: number | null;
    createdAt: string;
    step5CompletedAt: string | null;
    isRestarted: boolean;
    _count: {
      emails: number;
    };
  }>;
}

const STEP_NAMES: Record<number, string> = {
  1: 'Partnership',
  2: 'Shipping',
  3: 'Preparing',
  4: 'Contract',
  5: 'Shipped',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
  },
  RESTARTED: {
    label: 'Recomeçada',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <RefreshCcw className="h-4 w-4" />,
  },
};

export function PartnershipHistory({ partnerships }: PartnershipHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter out active partnerships, show only completed/cancelled/restarted
  const history = partnerships.filter(
    p => p.status === 'COMPLETED' || p.status === 'CANCELLED' || p.status === 'RESTARTED'
  );

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Sem histórico de parcerias anteriores</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <History className="h-4 w-4" />
        Histórico de Parcerias ({history.length})
      </h4>

      {history.map((partnership) => {
        const isExpanded = expandedId === partnership.id;
        const statusConfig = STATUS_CONFIG[partnership.status] || STATUS_CONFIG.CANCELLED;

        return (
          <div
            key={partnership.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : partnership.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="text-sm text-gray-600">
                  {partnership.agreedPrice !== null ? `${partnership.agreedPrice}€` : 'Sem valor'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(partnership.createdAt)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID da Parceria:</span>
                    <span className="text-gray-900 font-mono">{partnership.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Step Alcançado:</span>
                    <span className="text-gray-900">
                      {partnership.currentStep} de 5 ({STEP_NAMES[partnership.currentStep]})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Emails Enviados:</span>
                    <span className="text-gray-900">{partnership._count.emails}</span>
                  </div>
                  {partnership.step5CompletedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Concluída em:</span>
                      <span className="text-gray-900">{formatDate(partnership.step5CompletedAt)}</span>
                    </div>
                  )}
                  {partnership.isRestarted && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      Esta parceria foi recomeçada numa nova parceria.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
