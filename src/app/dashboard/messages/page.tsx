'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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

  // Fetch emails
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

      // Mark as read
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

      // Refresh emails
      fetchEmails();
      setSelectedEmail(null);
    } catch (error: any) {
      addToast('Erro ao detectar: ' + error.message, 'error');
    }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', {
        method: 'POST',
      });

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: Email List */}
      <div className="w-full max-w-md border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mensagens</h1>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Procurar emails..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searching}
              onChange={(e) => setSearching(e.target.value)}
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition"
          >
            {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Agora'}
          </button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              A carregar...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum email encontrado
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition ${
                    selectedEmail?.id === email.id
                      ? 'bg-blue-100 border-l-4 border-blue-600'
                      : ''
                  } ${!email.isRead ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {email.from}
                    </span>
                    {email.influencer ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-700 truncate mb-1">
                    {email.subject}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(email.receivedAt).toLocaleDateString('pt-PT')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Email Detail */}
      {selectedEmail ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-blue-600 hover:text-blue-700 mb-4 text-sm"
            >
              ← Voltar
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedEmail.subject}
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  De: {selectedEmail.from}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(selectedEmail.receivedAt).toLocaleDateString(
                    'pt-PT',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Influencer Info or Auto-Detect */}
          {selectedEmail.influencer ? (
            <div className="p-6 bg-green-50 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">
                    ✅ Ligado a Influenciador
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedEmail.influencer.name}
                  </p>
                  {selectedEmail.influencer.fitScore && (
                    <p className="text-sm text-gray-600 mt-1">
                      Fit Score: {selectedEmail.influencer.fitScore}/5
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    window.location.href = `/dashboard/influencers/${selectedEmail.influencer?.id}`
                  }
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Ver Perfil
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-amber-50 border-b border-amber-200">
              <p className="text-sm text-amber-700 mb-4">
                ⚠️ Remetente não está registado como influenciador
              </p>
              <button
                onClick={handleAutoDetect}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                🔍 Detectar/Adicionar Influenciador
              </button>
            </div>
          )}

          {/* Email Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedEmail.htmlBody ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedEmail.body}
              </p>
            )}

            {/* Attachments */}
            {selectedEmail.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Anexos ({selectedEmail.attachments.length})
                </h3>
                <ul className="space-y-2">
                  {selectedEmail.attachments.map((att, idx) => (
                    <li
                      key={idx}
                      className="flex items-center p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <span className="text-sm text-gray-700">
                        📎 {att.filename}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center text-gray-500">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Seleciona um email para ver detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
