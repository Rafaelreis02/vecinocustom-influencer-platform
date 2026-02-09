'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  Reply,
  Trash2,
  Eye,
  EyeOff,
  Send,
  Paperclip,
  Inbox,
  CheckSquare,
  Archive,
  Flag,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Email {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged: boolean;
  influencer?: { id: string; name: string; fitScore?: number; tier?: string } | null;
}

interface EmailDetail extends Email {
  to: string;
  body: string;
  htmlBody?: string;
  attachments: any[];
  labels: string[];
}

type FilterType = 'inbox' | 'unread' | 'sent' | 'flagged';

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('inbox');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

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
        fetchEmails();
      }
    } catch (error: any) {
      addToast('Erro ao carregar email: ' + error.message, 'error');
    }
  }

  async function handleToggleRead() {
    if (!selectedEmail) return;
    try {
      const newReadState = !selectedEmail.isRead;
      await fetch(`/api/emails/${selectedEmail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: newReadState }),
      });
      setSelectedEmail({ ...selectedEmail, isRead: newReadState });
      addToast(newReadState ? 'Marcado como lido' : 'Marcado como por ler', 'success');
      fetchEmails();
    } catch (error: any) {
      addToast('Erro: ' + error.message, 'error');
    }
  }

  async function handleToggleFlag() {
    if (!selectedEmail) return;
    try {
      const newFlagState = !selectedEmail.isFlagged;
      await fetch(`/api/emails/${selectedEmail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: newFlagState }),
      });
      setSelectedEmail({ ...selectedEmail, isFlagged: newFlagState });
      fetchEmails();
    } catch (error: any) {
      addToast('Erro: ' + error.message, 'error');
    }
  }

  async function handleSendReply() {
    if (!selectedEmail || !replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });

      if (!res.ok) throw new Error('Failed to send reply');

      addToast('✅ Resposta enviada!', 'success');
      setReplyText('');
      setAttachmentFile(null);
      setShowReplyModal(false);
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao enviar: ' + error.message, 'error');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleDelete() {
    if (!selectedEmail) return;

    const confirmed = window.confirm('Tens a certeza que queres eliminar este email?');
    if (!confirmed) return;

    try {
      await fetch(`/api/emails/${selectedEmail.id}`, {
        method: 'DELETE',
      });

      addToast('✅ Email eliminado', 'success');
      setSelectedEmail(null);
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao eliminar: ' + error.message, 'error');
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

  // Smart search: busca em subject, body, e from
  const filteredEmails = emails.filter((email) => {
    // Apply filter
    if (filter === 'unread' && email.isRead) return false;
    if (filter === 'flagged' && !email.isFlagged) return false;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        (email as any).body?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const flaggedCount = emails.filter((e) => e.isFlagged).length;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Filters */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setFilter('inbox')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
              filter === 'inbox'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Inbox className="h-5 w-5" />
            <span>Inbox</span>
            <span className="ml-auto text-sm font-medium">{emails.length}</span>
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Eye className="h-5 w-5" />
            <span>Por ler</span>
            <span className="ml-auto text-sm font-medium">{unreadCount}</span>
          </button>

          <button
            onClick={() => setFilter('flagged')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
              filter === 'flagged'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Flag className="h-5 w-5" />
            <span>Marcados</span>
            <span className="ml-auto text-sm font-medium">{flaggedCount}</span>
          </button>
        </nav>
      </div>

      {/* Email List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar assunto, remetente, texto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
            <div className="divide-y divide-gray-200">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition border-l-4 ${
                    selectedEmail?.id === email.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'border-transparent'
                  } ${!email.isRead ? 'bg-blue-50/30 font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {email.from}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      {email.isFlagged && <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      {email.influencer ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 truncate mb-1">{email.subject}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(email.receivedAt).toLocaleDateString('pt-PT')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      {selectedEmail ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-blue-600 hover:text-blue-700 text-sm mb-4"
            >
              ← Voltar
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h2>

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">De: {selectedEmail.from}</p>
                <p className="text-sm text-gray-500">
                  Para: {selectedEmail.to}
                </p>
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleToggleRead}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title={selectedEmail.isRead ? 'Marcar como por ler' : 'Marcar como lido'}
                >
                  {selectedEmail.isRead ? (
                    <EyeOff className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-blue-600" />
                  )}
                </button>
                <button
                  onClick={handleToggleFlag}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Marcar com flag"
                >
                  <Flag
                    className={`h-5 w-5 ${
                      selectedEmail.isFlagged
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowReplyModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Responder"
                >
                  <Reply className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-100 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="h-5 w-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Influencer Info or Auto-Detect */}
          {selectedEmail.influencer ? (
            <div className="p-6 bg-green-50 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">✅ Ligado a Influenciador</p>
                  <p className="text-lg font-bold text-gray-900">{selectedEmail.influencer.name}</p>
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
              <p className="text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</p>
            )}

            {/* Attachments */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Anexos ({selectedEmail.attachments.length})</h3>
                <ul className="space-y-2">
                  {selectedEmail.attachments.map((att, idx) => (
                    <li key={idx} className="flex items-center p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="text-sm text-gray-700">📎 {att.filename}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Seleciona um email para ver detalhes</p>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full h-96 rounded-t-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Responder a {selectedEmail.from}</h3>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText('');
                  setAttachmentFile(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreve a tua resposta aqui..."
                className="w-full h-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex gap-2">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300">
                  <Paperclip className="h-5 w-5" />
                  {attachmentFile ? `1 anexo` : 'Anexo'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyText('');
                    setAttachmentFile(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  <Send className="h-4 w-4" />
                  {sendingReply ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
