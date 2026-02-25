'use client';

import { FileCheck, FileText } from 'lucide-react';

interface PartnershipStep4Props {
  workflow: {
    contractSigned: boolean;
    contractUrl: string | null;
  };
  isLocked: boolean;
}

export function PartnershipStep4({ workflow }: PartnershipStep4Props) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 4: Contract</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-purple-600">Pelo influencer:</span> Confirmação de assinatura do contrato
        </p>
      </div>

      {/* Status do Contrato */}
      <div className={`border rounded-lg p-4 ${
        workflow.contractSigned 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${
            workflow.contractSigned ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <FileCheck className={`h-5 w-5 ${
              workflow.contractSigned ? 'text-green-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h5 className={`font-medium ${
              workflow.contractSigned ? 'text-green-900' : 'text-gray-900'
            }`}>
              {workflow.contractSigned ? 'Contrato Assinado' : 'Aguardando Assinatura'}
            </h5>
            <p className={`text-sm mt-1 ${
              workflow.contractSigned ? 'text-green-700' : 'text-gray-500'
            }`}>
              {workflow.contractSigned 
                ? 'O influencer confirmou que assinou o contrato de parceria.'
                : 'O influencer ainda não confirmou a assinatura do contrato.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* URL do Contrato (se existir) */}
      {workflow.contractUrl && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Link do Contrato</span>
          </div>
          <a 
            href={workflow.contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 break-all"
          >
            {workflow.contractUrl}
          </a>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <span className="font-medium">ℹ️ Nota:</span> O influencer confirma a assinatura do contrato através do portal. 
          Assim que confirmar, poderá avançar automaticamente para o Step 5.
        </p>
      </div>
    </div>
  );
}
