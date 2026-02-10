'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGlobalToast } from '@/contexts/ToastContext';
import { Settings, CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react';

function SettingsContent() {
  const searchParams = useSearchParams();
  const { addToast } = useGlobalToast();
  
  const [loading, setLoading] = useState(true);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyData, setShopifyData] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const checkShopifyConnection = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shopify/status');
      const data = await res.json();
      
      if (data.connected) {
        setShopifyConnected(true);
        setShopifyData(data.shop);
      } else {
        setShopifyConnected(false);
      }
    } catch (error) {
      console.error('Error checking Shopify connection:', error);
      setShopifyConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const shopifyParam = searchParams.get('shopify');
    const errorParam = searchParams.get('error');

    if (shopifyParam === 'connected') {
      addToast('✅ Shopify conectado com sucesso!', 'success');
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (errorParam) {
      let errorMessage = 'Erro ao conectar ao Shopify';
      if (errorParam === 'missing_params') errorMessage = 'Parâmetros em falta';
      else if (errorParam === 'invalid_state') errorMessage = 'Estado inválido (CSRF)';
      else if (errorParam === 'invalid_hmac') errorMessage = 'HMAC inválido';
      else if (errorParam === 'connection_failed') errorMessage = 'Falha na conexão';
      
      addToast(errorMessage, 'error');
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    checkShopifyConnection();
  }, [searchParams, addToast, checkShopifyConnection]);


  const handleConnect = () => {
    window.location.href = '/api/shopify/auth';
  };

  const handleDisconnect = async () => {
    if (!confirm('Tens a certeza que queres desconectar o Shopify?')) {
      return;
    }

    try {
      const res = await fetch('/api/shopify/disconnect', {
        method: 'POST',
      });

      if (res.ok) {
        setShopifyConnected(false);
        setShopifyData(null);
        addToast('Shopify desconectado', 'success');
      } else {
        addToast('Erro ao desconectar', 'error');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      addToast('Erro ao desconectar', 'error');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const res = await fetch('/api/shopify/test');
      const data = await res.json();
      
      if (data.success) {
        addToast('✅ Conexão Shopify OK!', 'success');
      } else {
        addToast('❌ Falha no teste: ' + data.error, 'error');
      }
    } catch (error) {
      addToast('Erro ao testar conexão', 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-slate-900" />
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
      </div>

      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-slate-900" />
            <h2 className="text-lg font-semibold text-slate-900">Integração Shopify</h2>
          </div>
          
          {shopifyConnected ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Desconectado</span>
            </div>
          )}
        </div>

        {shopifyConnected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Loja</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {shopifyData?.name || process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estado</p>
                  <p className="text-sm font-semibold text-green-600">Ativo</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {testing ? 'A testar...' : 'Testar Conexão'}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded border border-red-600 text-red-600 text-sm font-semibold hover:bg-red-50 transition"
              >
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Conecta a tua loja Shopify para gerir cupões de desconto dos influencers e calcular comissões automaticamente.
            </p>
            
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-sm text-blue-800 mb-2 font-semibold">Permissões necessárias:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Ler encomendas (read_orders)</li>
                <li>• Gerir regras de preço (write_price_rules, read_price_rules)</li>
                <li>• Gerir cupões de desconto (write_discounts, read_discounts)</li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              className="px-6 py-3 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              Conectar Shopify
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Outras Configurações</h2>
        <p className="text-sm text-gray-500">
          Mais opções de configuração serão adicionadas em breve.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}