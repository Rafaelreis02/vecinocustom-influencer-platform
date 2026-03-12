'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Calendar, CheckCircle2 } from 'lucide-react';

interface PartnershipHistoryProps {
  partnerships: Array<{
    id: string;
    currentStep: number;
    status: string;
    agreedPrice: number | null;
    createdAt: string;
    step9CompletedAt: string | null;
    isRestarted: boolean;
  }>;
}

const STEP_NAMES: Record<number, string> = {
  1: 'Partnership',
  2: 'Shipping',
  3: 'Preparing',
  4: 'Design Review',
  5: 'Contract',
  6: 'Contract Signed',
  7: 'Shipped',
  8: 'Delivered',
  9: 'Completed',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: {
    label: 'Parceria Concluída',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

export function PartnershipHistory({ partnerships }: PartnershipHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Only show successfully completed partnerships (not cancelled)
  const history = partnerships.filter(
    p => p.status === 'COMPLETED' && p.currentStep >= 8
  );

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Sem parcerias concluídas anteriormente</p>
        <p className="text-xs text-gray-400 mt-1">
          Apenas parcerias finalizadas com sucesso aparecem aqui
        </p>
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
                    <span className="text-gray-500">Data de Início:</span>
                    <span className="text-gray-900">{formatDate(partnership.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data de Conclusão:</span>
                    <span className="text-gray-900">{partnership.step9CompletedAt ? formatDate(partnership.step9CompletedAt) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor da Parceria:</span>
                    <span className="text-gray-900 font-semibold">
                      {partnership.agreedPrice !== null ? `${partnership.agreedPrice}€` : 'Comissão apenas'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
