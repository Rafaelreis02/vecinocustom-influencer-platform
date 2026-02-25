'use client';

import { MapPin, Gift, Truck, User } from 'lucide-react';

interface PartnershipStep2Props {
  workflow: {
    shippingAddress: string | null;
    productSuggestion1: string | null;
    productSuggestion2: string | null;
    productSuggestion3: string | null;
  };
  isLocked: boolean;
}

export function PartnershipStep2({ workflow }: PartnershipStep2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Step 2: Shipping</h4>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-purple-600">Pelo influencer:</span> Morada e sugestões de produtos
        </p>
      </div>

      {/* Morada */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Morada de Envio</span>
        </div>
        {workflow.shippingAddress ? (
          <p className="text-sm text-gray-900 whitespace-pre-line">{workflow.shippingAddress}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Aguardando influencer preencher no portal...</p>
        )}
      </div>

      {/* Sugestões de Produtos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Sugestões de Produtos</span>
        </div>

        <div className="space-y-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <span className="text-xs font-medium text-gray-500">Sugestão 1</span>
            {workflow.productSuggestion1 ? (
              <a 
                href={workflow.productSuggestion1}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800 truncate mt-1"
              >
                {workflow.productSuggestion1}
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic mt-1">Aguardando...</p>
            )}
          </div>

          {workflow.productSuggestion2 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500">Sugestão 2</span>
              <a 
                href={workflow.productSuggestion2}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800 truncate mt-1"
              >
                {workflow.productSuggestion2}
              </a>
            </div>
          )}

          {workflow.productSuggestion3 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500">Sugestão 3</span>
              <a 
                href={workflow.productSuggestion3}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-800 truncate mt-1"
              >
                {workflow.productSuggestion3}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <span className="font-medium">ℹ️ Nota:</span> O influencer preenche estes dados através do portal de parceria. 
          Assim que preencher, poderá avançar automaticamente para o Step 3.
        </p>
      </div>
    </div>
  );
}
