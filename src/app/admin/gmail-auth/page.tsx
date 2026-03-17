'use client';

import { useState } from 'react';

export default function GmailAuthPage() {
  const [step, setStep] = useState<'start' | 'waiting' | 'success' | 'error'>('start');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  async function getAuthUrl() {
    setStep('waiting');
    try {
      const res = await fetch('/api/admin/gmail-token');
      const data = await res.json();
      
      if (data.url) {
        // Abrir popup para autorização
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'gmail-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Verificar se popup foi bloqueado
        if (!popup || popup.closed) {
          setError('Popup bloqueado. Permite popups para este site.');
          setStep('error');
        }
      }
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
  }

  async function exchangeToken() {
    if (!code.trim()) {
      setError('Coloca o código primeiro');
      return;
    }
    
    setStep('waiting');
    try {
      const res = await fetch('/api/admin/gmail-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setToken(data.refreshToken);
        setStep('success');
      } else {
        setError(data.message || 'Erro desconhecido');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Autorizar Gmail</h1>
        <p className="text-gray-600 mb-6">
          Gera um novo token OAuth com permissão para ler threads do Gmail.
        </p>

        {step === 'start' && (
          <div className="space-y-4">
            <button
              onClick={getAuthUrl}
              className="w-full py-4 bg-[#0E1E37] text-white rounded-xl font-semibold hover:bg-[#1a2f4f]"
            >
              Iniciar Autorização
            </button>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Passos:</strong>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Clica no botão acima</li>
                  <li>Faz login com brand@vecinocustom.com</li>
                  <li>Autoriza as permissões</li>
                  <li>Copia o código que aparece</li>
                  <li>Cole aqui em baixo</li>
                </ol>
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Código de autorização:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="4/0A..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0E1E37]"
              />
              <button
                onClick={exchangeToken}
                disabled={!code.trim()}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                Obter Token
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-[#0E1E37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">A processar...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-800 font-semibold mb-2">✅ Token gerado com sucesso!</p>
              <p className="text-sm text-green-700 mb-4">Copia este token e guarda em segurança:</p>
              
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm break-all">
                {token}
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Próximos passos:</strong>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Copia o token acima</li>
                  <li>Guarda no 1Password</li>
                  <li>Vai ao Vercel Dashboard</li>
                  <li>Atualiza GOOGLE_REFRESH_TOKEN</li>
                  <li>Faz Redeploy</li>
                </ol>
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 font-semibold">❌ Erro</p>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setStep('start')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
