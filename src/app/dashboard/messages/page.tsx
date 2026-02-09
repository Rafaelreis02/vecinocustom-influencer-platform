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
  Download,
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

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

  async function handleQuickToggleRead(e: React.MouseEvent, emailId: string, isRead: boolean) {
    e.stopPropagation();
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead }),
      });
      fetchEmails();
    } catch (error: any) {
      addToast('Erro: ' + error.message, 'error');
    }
  }

  async function handleQuickToggleFlag(e: React.MouseEvent, emailId: string, isFlagged: boolean) {
    e.stopPropagation();
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !isFlagged }),
      });
      fetchEmails();
    } catch (error: any) {
      addToast('Erro: ' + error.message, 'error');
    }
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  }

  function getInitials(email: string) {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  }

  function getAvatarColor(email: string) {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar - Mobile Drawer */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white flex flex-col transition-transform duration-300 ${
        showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition text-sm"
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
      <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col bg-white transition-all duration-300 ${
        selectedEmail ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header with Menu */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-2 md:hidden">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold flex-1">Mensagens</h2>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`w-full text-left p-3 md:p-4 hover:bg-gray-50 transition border-l-4 cursor-pointer group ${
                    selectedEmail?.id === email.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'border-transparent'
                  } ${!email.isRead ? 'bg-blue-50/30 font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs md:text-sm font-medium text-gray-900 truncate flex-1">
                      {email.from.split('@')[0]}
                    </span>
                    <div className="flex gap-1 flex-shrink-0 items-center">
                      {/* Quick Action: Toggle Read */}
                      <button
                        onClick={(e) => handleQuickToggleRead(e, email.id, email.isRead)}
                        className="p-1 hover:bg-gray-200 rounded transition opacity-0 group-hover:opacity-100 md:opacity-100"
                        title={email.isRead ? 'Marcar como por ler' : 'Marcar como lido'}
                      >
                        {email.isRead ? (
                          <EyeOff className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        ) : (
                          <Eye className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                        )}
                      </button>

                      {/* Quick Action: Toggle Flag */}
                      <button
                        onClick={(e) => handleQuickToggleFlag(e, email.id, email.isFlagged)}
                        className="p-1 hover:bg-gray-200 rounded transition opacity-0 group-hover:opacity-100 md:opacity-100"
                        title="Marcar com flag"
                      >
                        <Flag
                          className={`h-3 w-3 md:h-4 md:w-4 ${
                            email.isFlagged
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>

                      {/* Status Icons */}
                      {email.influencer ? (
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-700 truncate mb-1 line-clamp-1">{email.subject}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(email.receivedAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      {selectedEmail ? (
        <div className="fixed inset-0 md:static md:flex-1 md:flex md:flex-col bg-white z-30 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-blue-600 hover:text-blue-700 text-sm mb-4 flex items-center gap-1"
            >
              ← Voltar
            </button>

            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 break-words">{selectedEmail.subject}</h2>

            {/* Sender Info with Avatar */}
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
              <button
                onClick={() => {
                  if (selectedEmail.influencer) {
                    window.location.href = `/dashboard/influencers/${selectedEmail.influencer.id}`;
                  } else {
                    setShowProfilePreview(true);
                  }
                }}
                className={`flex-shrink-0 w-10 h-10 rounded-full ${getAvatarColor(selectedEmail.from)} text-white font-bold text-sm flex items-center justify-center hover:opacity-80 transition cursor-pointer`}
                title={selectedEmail.influencer ? "Ver perfil completo" : "Ver detalhes"}
              >
                {getInitials(selectedEmail.from)}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedEmail.from}</p>
                <p className="text-xs text-gray-500 truncate">Para: {selectedEmail.to}</p>
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

              {/* Action Buttons - Quick Actions */}
              <div className="flex gap-2 flex-shrink-0">
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
              </div>
            </div>
          </div>


          {/* Email Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {selectedEmail.htmlBody ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
              />
            ) : (
              <p className="text-sm md:text-base text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</p>
            )}

            {/* Attachments - Horizontal Scroll */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 pb-20">
                <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
                  <div className="flex gap-3 pb-2">
                    {selectedEmail.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 hover:border-blue-400 transition cursor-pointer group flex-shrink-0 min-w-max bg-gray-50 hover:bg-blue-50"
                        title={`Baixar ${att.filename}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate group-hover:text-blue-600 font-medium">
                            {att.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {att.size ? `${(att.size / 1024).toFixed(0)} KB` : 'Anexo'}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Reply Button at Bottom */}
          <div className="p-3 md:p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              onClick={() => setShowReplyModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition text-sm"
            >
              <Reply className="h-4 w-4" />
              Responder
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center text-gray-500">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Seleciona um email para ver detalhes</p>
          </div>
        </div>
      )}

      {/* Profile Preview Sidebar */}
      {showProfilePreview && selectedEmail && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowProfilePreview(false)}
          />
          <div className={`fixed inset-y-0 right-0 z-40 w-full md:w-96 bg-white shadow-xl transition-transform duration-300 overflow-y-auto ${
            showProfilePreview ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Perfil</h3>
              <button
                onClick={() => setShowProfilePreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-4">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-4">
                <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedEmail.from)} text-white font-bold text-2xl flex items-center justify-center mb-3`}>
                  {getInitials(selectedEmail.from)}
                </div>
                <h2 className="text-lg font-bold text-gray-900 truncate text-center">{selectedEmail.from}</h2>
              </div>

              {/* Email Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm text-gray-900 truncate">{selectedEmail.from}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Primeiro Email</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEmail.receivedAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>

              {/* Influencer Info or CTA */}
              {selectedEmail.influencer ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">✅ Influenciador Registado</p>
                  <p className="text-lg font-bold text-gray-900 mb-2">{selectedEmail.influencer.name}</p>
                  {selectedEmail.influencer.fitScore && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Fit Score</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-lg ${i < (selectedEmail.influencer?.fitScore || 0) ? '⭐' : '☆'}`}>
                            {i < (selectedEmail.influencer?.fitScore || 0) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      window.location.href = `/dashboard/influencers/${selectedEmail.influencer?.id}`;
                    }}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Ver Perfil Completo
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-sm text-amber-700 font-semibold mb-3">⚠️ Não Registado</p>
                  <button
                    onClick={() => {
                      setShowProfilePreview(false);
                      handleAutoDetect();
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Adicionar como Influenciador
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:w-2xl h-screen md:h-auto rounded-t-2xl md:rounded-2xl flex flex-col md:max-h-96">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">Responder a {selectedEmail.from.split('@')[0]}</h3>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText('');
                  setAttachmentFile(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
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
                className="w-full h-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex flex-col md:flex-row gap-2 md:gap-4 md:items-center md:justify-between flex-shrink-0">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm">
                <Paperclip className="h-5 w-5 flex-shrink-0" />
                {attachmentFile ? `1 anexo` : 'Anexo'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyText('');
                    setAttachmentFile(null);
                  }}
                  className="flex-1 md:flex-none px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition text-sm"
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
