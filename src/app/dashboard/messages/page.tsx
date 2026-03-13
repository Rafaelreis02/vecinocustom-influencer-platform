'use client';

import { useState, useEffect } from 'react';
import {
  Mail, Search, RefreshCw, Send, Reply, Trash2, Eye, EyeOff, Flag,
  ChevronLeft, ChevronRight, Loader2, X, Plus
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { getWorkflowStatuses, getStatusConfig } from '@/lib/influencer-status';

interface Email {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged: boolean;
  body?: string;
  influencer?: { id: string; name: string; status?: string; avatarUrl?: string | null } | null;
}

interface EmailDetail extends Email {
  to: string;
  body: string;
  htmlBody?: string;
}

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'flagged'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 20;
  
  // Status options for filter
  const statusOptions = [
    { value: 'SUGGESTION', label: 'Sugestão' },
    { value: 'ANALYZING', label: 'Em Análise' },
    { value: 'COUNTER_PROPOSAL', label: 'Contra-proposta' },
    { value: 'AGREED', label: 'Aceite' },
    { value: 'PRODUCT_SELECTION', label: 'Seleção Produto' },
    { value: 'DESIGN_REFERENCE_SUBMITTED', label: 'Ref. Design' },
    { value: 'CONTRACT_PENDING', label: 'Pendente Contrato' },
    { value: 'SHIPPED', label: 'Enviado' },
    { value: 'COMPLETED', label: 'Concluído' },
  ];

  // Reply
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    }
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusDropdown]);

  async function fetchEmails() {
    try {
      setLoading(true);
      const res = await fetch('/api/emails');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEmails(data);
    } catch (error) {
      addToast('Erro ao carregar emails', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailClick(email: Email) {
    try {
      const res = await fetch(`/api/emails/${email.id}`);
      const data = await res.json();
      setSelectedEmail(data);
      setShowReply(false);
      setReplyText('');
      
      if (!email.isRead) {
        await fetch(`/api/emails/${email.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        fetchEmails();
      }
    } catch (error) {
      addToast('Erro ao abrir email', 'error');
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
      if (!res.ok) throw new Error();
      
      addToast('Email enviado!', 'success');
      setShowReply(false);
      setReplyText('');
      fetchEmails();
    } catch (error) {
      addToast('Erro ao enviar', 'error');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', { method: 'POST' });
      const data = await res.json();
      addToast(`${data.synced} emails sincronizados`, 'success');
      fetchEmails();
    } catch (error) {
      addToast('Erro na sincronização', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleFlag(emailId: string) {
    try {
      await fetch(`/api/emails/${emailId}/toggle-flag`, { method: 'PATCH' });
      fetchEmails();
    } catch (error) {
      addToast('Erro', 'error');
    }
  }

  async function deleteEmail(emailId: string) {
    if (!confirm('Eliminar este email?')) return;
    try {
      await fetch(`/api/emails/${emailId}`, { method: 'DELETE' });
      setSelectedEmail(null);
      fetchEmails();
      addToast('Email eliminado', 'success');
    } catch (error) {
      addToast('Erro ao eliminar', 'error');
    }
  }

  const filteredList = emails.filter(e => {
    if (filter === 'unread' && e.isRead) return false;
    if (filter === 'flagged' && !e.isFlagged) return false;
    if (statusFilter !== 'all' && e.influencer?.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / emailsPerPage);
  const currentEmails = filteredList.slice((currentPage - 1) * emailsPerPage, currentPage * emailsPerPage);

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex">
      {/* Lista de Emails */}
      <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} w-full md:w-[45%] lg:w-[40%] flex-col border-r border-gray-100`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Emails</h1>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border-0 bg-gray-50 py-3 pl-11 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#0E1E37]/20 transition-all"
            />
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'unread', label: 'Não lidos' },
              { key: 'flagged', label: 'Marcados' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  filter === key 
                    ? 'bg-[#0E1E37] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            
            {/* Status Filter Dropdown */}
            <div className="relative status-dropdown-container">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                  statusFilter !== 'all'
                    ? 'bg-[#0E1E37] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {statusFilter === 'all' ? 'Status' : statusOptions.find(s => s.value === statusFilter)?.label}
                <ChevronRight className={`h-3 w-3 transition-transform ${showStatusDropdown ? 'rotate-90' : ''}`} />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-2 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      statusFilter === 'all' ? 'text-[#0E1E37] font-medium' : 'text-gray-600'
                    }`}
                  >
                    Todos os status
                  </button>
                  <div className="h-px bg-gray-100 mx-4 my-1" />
                  {statusOptions.map((status) => {
                    const config = getStatusConfig(status.value);
                    return (
                      <button
                        key={status.value}
                        onClick={() => { setStatusFilter(status.value); setShowStatusDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          statusFilter === status.value ? 'text-[#0E1E37] font-medium bg-gray-50' : 'text-gray-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" strokeWidth={1.5} />
            </div>
          ) : currentEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">Nenhuma mensagem</p>
            </div>
          ) : (
            currentEmails.map(email => (
              <div
                key={email.id}
                onClick={() => handleEmailClick(email)}
                className={`group p-4 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-blue-50/50' : ''
                } ${!email.isRead ? 'bg-blue-50/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-[#0E1E37] text-white flex items-center justify-center font-semibold text-sm shrink-0">
                    {email.from.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.from.split('@')[0]}
                      </span>
                      {email.influencer && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full">
                          {email.influencer.name}
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                      {email.subject}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {email.isFlagged && (
                        <Flag className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(email.receivedAt).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Detalhe do Email */}
      {selectedEmail && (
        <div className="fixed md:relative inset-0 md:inset-auto z-50 flex-1 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" strokeWidth={2} />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-[#0E1E37] text-white flex items-center justify-center font-semibold">
                {selectedEmail.from.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selectedEmail.from}</p>
                <p className="text-xs text-gray-400">
                  {new Date(selectedEmail.receivedAt).toLocaleString('pt-PT')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleFlag(selectedEmail.id)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <Flag className={`h-4 w-4 ${selectedEmail.isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => deleteEmail(selectedEmail.id)}
                className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setSelectedEmail(null)}
                className="hidden md:flex w-10 h-10 rounded-full hover:bg-gray-100 items-center justify-center text-gray-400"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{selectedEmail.subject}</h2>
            
            {selectedEmail.htmlBody ? (
              <div 
                className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
            )}
          </div>

          {/* Footer com Responder */}
          <div className="border-t border-gray-100 p-4">
            {showReply ? (
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreve a tua resposta..."
                  className="w-full h-32 p-4 rounded-2xl border-0 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#0E1E37]/20 resize-none transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="flex-1 py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" strokeWidth={2} />
                    {sendingReply ? 'A enviar...' : 'Enviar (enviar email)'}
                  </button>
                  <button
                    onClick={() => setShowReply(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowReply(true)}
                className="w-full py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Reply className="h-4 w-4" strokeWidth={2} />
                Responder
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedEmail && (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Mail className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-gray-400 text-sm">Seleciona um email para ler</p>
        </div>
      )}
    </div>
  );
}
