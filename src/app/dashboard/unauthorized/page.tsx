'use client';

import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acesso Negado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Não tens permissão para aceder a esta página. 
          Esta funcionalidade está reservada a administradores.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Se achas que isto é um erro, contacta o administrador do sistema.</p>
        </div>
      </div>
    </div>
  );
}
