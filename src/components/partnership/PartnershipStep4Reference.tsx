'use client';

import { useState } from 'react';
import { Loader2, ImageIcon, CheckCircle, ArrowRight } from 'lucide-react';

interface PartnershipStep4ReferenceProps {
  workflow: {
    id: string;
    designReferenceUrl: string | null;
    designReferenceSubmittedAt: string | null;
  };
  isLocked: boolean;
  onAdvance?: () => void;
}

export function PartnershipStep4Reference({ workflow, isLocked, onAdvance }: PartnershipStep4ReferenceProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleAdvance = async () => {
    if (!onAdvance) return;
    setIsAdvancing(true);
    await onAdvance();
    setIsAdvancing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 4: Design Reference</h4>
        <p className="text-sm text-gray-500">
          Referência enviada pelo influencer do que pretende gravar na peça.
        </p>
      </div>

      {workflow.designReferenceUrl ? (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <img
              src={workflow.designReferenceUrl}
              alt="Design Reference"
              className="w-full max-h-96 object-contain"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Referência Recebida</p>
                <p className="text-sm text-blue-700">
                  Enviada em: {workflow.designReferenceSubmittedAt 
                    ? new Date(workflow.designReferenceSubmittedAt).toLocaleString('pt-PT')
                    : 'Data desconhecida'}
                </p>
              </div>
            </div>
          </div>

          {/* Action */}
          {!isLocked && onAdvance && (
            <div className="flex justify-end">
              <button
                onClick={handleAdvance}
                disabled={isAdvancing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    Avançar para Design Review
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aguardando Referência</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            O influencer ainda não enviou nenhuma imagem de referência. 
            Assim que enviar, poderás visualizá-la aqui.
          </p>
        </div>
      )}
    </div>
  );
}
