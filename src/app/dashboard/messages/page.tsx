'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, AlertCircle, CheckCircle, Clock, X, RefreshCw } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Email {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged: boolean;
  influencer?: {
    id: string;
    name: string;
    fitScore?: number;
    tier?: string;
  } | null;
}

interface EmailDetail extends Email {
  to: string;
  body: string;
  htmlBody?: string;
  attachments: any[];
  labels: string[];
}

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    try {
      setLoading(true);
      const res = await fetch('/api/emails');
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();
      setEmails(data);
    } catch (error: any) {
      addToast('Erro ao carregar emails: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailClick(email: Email) {
    try {
      const res = await fetch(`/api/emails/${email.id}`);
      if (!res.ok) throw new Error('Failed to fetch email details');
      const data = await res.json();
      setSelectedEmail(data);
      if (!email.isRead) {
        await fetch(`/api/emails/${email.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
      }
    } catch (error: any) {
      addToast('Erro ao carregar email: ' + error.message, 'error');
    }
  }

  async function handleAutoDetect() {
    if (!selectedEmail) return;
    try {
      const res = await fetch(`/api/emails/${selectedEmail.id}/auto-detect`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to auto-detect');
      const result = await res.json();
      addToast(
        result.influencer.isNew
          ? `✅ Influenciador criado: ${result.influencer.name}`
          : `✅ Ligado a: ${result.influencer.name}`,
        'success'
      );
      fetchEmails();
      setSelectedEmail(null);
    } catch (error: any) {
      addToast('Erro ao detectar: ' + error.message, 'error');
    }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      addToast(`✅ Sincronizados ${data.synced} emails!`, 'success');
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao sincronizar: ' + error.message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  const filteredEmails = emails.filter(
    (email) =>
      email.from.toLowerCase().includes(searching.toLowerCase()) ||
      email.subject.toLowerCase().includes(searching.toLowerCase())
  );

  const getInitials = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left: Email List */}
      <div className="w-full md:w-96 bg-white md:border-r md:border-gray-200 flex flex-col md:shadow-xl">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">📧 Mensagens</h1>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-white/60" />
            <input
              type="text"
              placeholder="Procurar..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              value={searching}
              onChange={(e) => setSearching(e.target.value)}
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white py-2.5 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 border border-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
              <p className="text-gray-500">A carregar...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhum email encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 p-2">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-all duration-200 ${
                    selectedEmail?.id === email.id
                      ? 'bg-blue-50 border-l-4 border-blue-600 shadow-md'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  } ${!email.isRead ? 'bg-blue-50/50 font-medium' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(email.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 truncate text-sm">
                          {email.from.split('@')[0]}
                        </span>
                        {email.influencer ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate mb-1">
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(email.receivedAt).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Email Detail */}
      {selectedEmail ? (
        <div className="fixed inset-0 md:static md:flex-1 flex flex-col bg-white md:rounded-tl-3xl md:shadow-2xl z-50 md:z-auto">
          {/* Header */}
          <div className="p-4 md:p-8 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-purple-50">
            <button
              onClick={() => setSelectedEmail(null)}
              className="md:hidden mb-4 p-2 hover:bg-gray-200 rounded-lg transition text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                {getInitials(selectedEmail.from)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 line-clamp-2">
                  {selectedEmail.subject}
                </h2>
                <p className="text-sm text-gray-600">De: <span className="font-semibold">{selectedEmail.from}</span></p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(selectedEmail.receivedAt).toLocaleDateString('pt-PT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Influencer Info or Auto-Detect */}
          {selectedEmail.influencer ? (
            <div className="p-4 md:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-semibold">Ligado a Influenciador</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedEmail.influencer.name}
                    </p>
                    {selectedEmail.influencer.fitScore && (
                      <p className="text-sm text-gray-600">
                        ⭐ Fit Score: {selectedEmail.influencer.fitScore}/5
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    window.location.href = `/dashboard/influencers/${selectedEmail.influencer?.id}`
                  }
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition shadow-md"
                >
                  Ver Perfil
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
              <p className="text-sm text-amber-800 mb-4 font-semibold">
                ⚠️ Remetente não está registado como influenciador
              </p>
              <button
                onClick={handleAutoDetect}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition shadow-lg flex items-center justify-center gap-2"
              >
                🔍 Detectar/Adicionar Influenciador
              </button>
            </div>
          )}

          {/* Email Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              {selectedEmail.htmlBody ? (
                <div
                  className="prose prose-sm md:prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body}
                </p>
              )}

              {/* Attachments */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    📎 Anexos ({selectedEmail.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedEmail.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                      >
                        <span className="text-2xl mr-3">📄</span>
                        <span className="text-sm text-gray-700 font-medium truncate">
                          {att.filename}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex md:flex-1 items-center justify-center">
          <div className="text-center">
            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Mail className="h-10 w-10 text-white/50" />
            </div>
            <p className="text-lg text-white/70">Seleciona um email para ver detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
