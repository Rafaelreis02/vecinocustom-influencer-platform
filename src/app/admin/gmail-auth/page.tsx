'use client';

import { useState } from 'react';

export default function GmailAuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startAuth() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/gmail-token');
      const data = await res.json();
      
      if (data.url) {
        // Redirecionar directamente para o Google
        window.location.href = data.url;
      } else {
        setError('Erro ao gerar URL de autorização');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-[#0E1E37] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Autorizar Gmail</h1>
        <p className="text-gray-500 mb-8">
          Gera um novo token para ler e enviar emails via Gmail API.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={startAuth}
          disabled={loading}
          className="w-full py-4 bg-[#0E1E37] text-white rounded-2xl font-semibold hover:bg-[#1a2f4f] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Autorizar com Google
            </>
          )}
        </button>

        <div className="mt-6 p-4 bg-amber-50 rounded-2xl text-left">
          <p className="text-xs text-amber-700">
            <strong>⚠️ Importante:</strong> Faz login com <strong>brand@vecinocustom.com</strong> e autoriza as permissões de leitura e envio de emails.
          </p>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-2xl text-left">
          <p className="text-xs text-blue-700">
            <strong>📋 Redirect URI para Google Console:</strong>
          </p>
          <code className="text-xs text-blue-600 break-all block mt-1">
            {typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/gmail/callback
          </code>
        </div>
      </div>
    </div>
  );
}
