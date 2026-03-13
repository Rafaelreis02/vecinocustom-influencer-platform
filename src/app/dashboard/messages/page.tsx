'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Search, RefreshCw, Send, ChevronLeft, ChevronRight, Loader2, X, Plus, UserPlus,
  Flag, Trash2, Sparkles, Wand2
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { getStatusConfig } from '@/lib/influencer-status';
import { InfluencerProfileCompact } from '@/components/InfluencerProfileCompact';

interface Email {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged: boolean;
  body?: string;
  influencer?: { id: string; name: string; email?: string | null; status?: string; avatarUrl?: string | null } | null;
}

interface EmailDetail extends Email {
  to: string;
  body: string;
  htmlBody?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isFromMe: boolean;
  timestamp: string;
  type: 'text' | 'html';
}

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'flagged'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 20;
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Status options
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
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Influencer Modal
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);
  const [availableInfluencers, setAvailableInfluencers] = useState<any[]>([]);
  const [influencerSearchQuery, setInfluencerSearchQuery] = useState('');
  const [associatingInfluencer, setAssociatingInfluencer] = useState(false);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedEmail) {
      // Convert email to chat format
      const messages: ChatMessage[] = [{
        id: selectedEmail.id,
        content: selectedEmail.htmlBody || selectedEmail.body,
        isFromMe: false,
        timestamp: selectedEmail.receivedAt,
        type: selectedEmail.htmlBody ? 'html' : 'text'
      }];
      setChatMessages(messages);
      scrollToBottom();
    }
  }, [selectedEmail]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    
    // Add message to chat immediately
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: replyText,
      isFromMe: true,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    setChatMessages(prev => [...prev, newMessage]);
    setReplyText('');
    
    try {
      setSendingReply(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      
      if (!res.ok) throw new Error();
      addToast('Email enviado!', 'success');
      fetchEmails();
    } catch (error) {
      addToast('Erro ao enviar', 'error');
    } finally {
      setSendingReply(false);
    }
  }

  async function generateAIResponse() {
    if (!selectedEmail) return;
    
    try {
      setGeneratingAI(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          language: 'en',
          tone: 'professional'
        }),
      });
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      setReplyText(data.suggestion);
      addToast('Reply generated!', 'success');
    } catch (error) {
      addToast('Error generating reply', 'error');
    } finally {
      setGeneratingAI(false);
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
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, isFlagged: !prev.isFlagged } : null);
      }
    } catch (error) {
      addToast('Erro', 'error');
    }
  }

  async function openInfluencerModal() {
    try {
      const res = await fetch('/api/influencers?limit=100');
      const data = await res.json();
      setAvailableInfluencers(data.data || []);
      setShowInfluencerModal(true);
    } catch (error) {
      addToast('Erro ao carregar influencers', 'error');
    }
  }
  
  async function associateInfluencer(influencerId: string) {
    if (!selectedEmail) return;
    
    try {
      setAssociatingInfluencer(true);
      
      // Call endpoint that associates this influencer to ALL emails from this sender
      const res = await fetch(`/api/emails/auto-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailId: selectedEmail.id,
          influencerId 
        }),
      });
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      await fetchEmails();
      const emailRes = await fetch(`/api/emails/${selectedEmail.id}`);
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setSelectedEmail(emailData);
      }
      
      addToast(`${data.associated} email(s) associated!`, 'success');
      setShowInfluencerModal(false);
      setInfluencerSearchQuery('');
    } catch (error) {
      addToast('Error associating', 'error');
    } finally {
      setAssociatingInfluencer(false);
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

  async function autoDetectInfluencers() {
    try {
      addToast('A detetar influencers...', 'info');
      const res = await fetch('/api/emails/auto-detect-all', { method: 'POST' });
      const data = await res.json();
      
      if (data.linked > 0) {
        addToast(`${data.linked} email(s) associados automaticamente!`, 'success');
        fetchEmails();
      } else {
        addToast('Nenhum novo email para associar', 'info');
      }
    } catch (error) {
      addToast('Erro na deteção automática', 'error');
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex">
      {/* Lista de Conversas */}
      <div className={`${selectedEmail ? 'hidden md:flex md:w-[380px] lg:w-[400px]' : 'flex w-full'} flex-col border-r border-gray-100 transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Mensagens</h1>
            <div className="flex items-center gap-1">
              <button 
                onClick={autoDetectInfluencers}
                className="px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-full transition-colors border border-violet-200 hover:border-violet-300"
              >
                Detetar Influencers
              </button>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
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
            
            {/* Status Filter */}
            <div className="relative status-dropdown-container">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                  statusFilter !== 'all' ? 'bg-[#0E1E37] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        
        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
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
                className={`group relative px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-white transition-all ${
                  selectedEmail?.id === email.id ? 'bg-white border-l-4 border-l-[#0E1E37]' : 'border-l-4 border-l-transparent bg-white/50'
                } ${!email.isRead ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar - Mostra foto do influencer se associado, senão inicial */}
                  <div className="relative">
                    {email.influencer?.avatarUrl ? (
                      <img 
                        src={email.influencer.avatarUrl} 
                        alt={email.influencer.name}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] text-white flex items-center justify-center font-semibold text-sm shrink-0 shadow-sm">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!email.isRead && (
                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Linha 1: Remetente + Data */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[15px] truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.from.split('@')[0]}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                        {formatDate(email.receivedAt)}
                      </span>
                    </div>
                    
                    {/* Linha 2: Assunto */}
                    <p className={`text-sm truncate mt-0.5 ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                      {email.subject}
                    </p>
                    
                    {/* Linha 3: Badge Influencer */}
                    {email.influencer && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                          <UserPlus className="h-3 w-3" />
                          {email.influencer.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Flag */}
                  {email.isFlagged && (
                    <div className="shrink-0">
                      <Flag className="h-4 w-4 text-amber-500 fill-amber-500" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-white">
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

      {/* Chat Interface */}
      {selectedEmail && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 hidden md:block"
            onClick={() => setSelectedEmail(null)}
          />
          
          {/* Chat Panel */}
          <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[calc(100%-380px)] lg:w-[calc(100%-400px)] bg-white z-50 shadow-2xl flex flex-col md:flex-row">
            
            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
              {/* Chat Header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" strokeWidth={2} />
                  </button>
                  
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] text-white flex items-center justify-center font-semibold">
                    {selectedEmail.from.charAt(0).toUpperCase()}
                  </div>
                  
                  <div>
                    <p className="font-semibold text-gray-900">{selectedEmail.from.split('@')[0]}</p>
                    <p className="text-xs text-gray-400">{selectedEmail.from}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFlag(selectedEmail.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      selectedEmail.isFlagged ? 'bg-amber-50 text-amber-500' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Flag className={`h-4 w-4 ${selectedEmail.isFlagged ? 'fill-amber-500' : ''}`} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Subject Banner */}
              <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 shrink-0">
                <p className="text-sm text-gray-600 font-medium truncate">
                  Assunto: {selectedEmail.subject}
                </p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div key={message.id} className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}>
                    {!message.isFromMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] text-white flex items-center justify-center text-xs font-semibold mr-2 shrink-0 self-end">
                        {selectedEmail.from.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] md:max-w-[70%] ${message.isFromMe ? 'ml-12' : 'mr-12'}`}>
                      <div className={`px-4 py-3 rounded-2xl ${
                        message.isFromMe 
                          ? 'bg-[#0E1E37] text-white rounded-br-md' 
                          : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                      }`}>
                        {message.type === 'html' ? (
                          <div 
                            className={`prose prose-sm max-w-none ${message.isFromMe ? 'prose-invert' : ''} chat-message-content`}
                            dangerouslySetInnerHTML={{ __html: message.content }}
                          />
                        ) : (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      
                      <p className={`text-[10px] mt-1 ${message.isFromMe ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                {/* AI Loading State */}
                {generatingAI && (
                  <div className="flex justify-center mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-full">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                      <span className="text-xs text-violet-600">Generating reply...</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full bg-transparent border-0 resize-none text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      rows={1}
                      style={{ minHeight: '24px', maxHeight: '120px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                  </div>
                  
                  {/* AI Button - Bolinha igual ao enviar */}
                  {!replyText && !generatingAI && (
                    <button
                      onClick={generateAIResponse}
                      className="w-11 h-11 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center hover:bg-violet-200 transition-colors"
                      title="Generate AI reply"
                    >
                      <Sparkles className="h-5 w-5" strokeWidth={2} />
                    </button>
                  )}
                  
                  {/* AI Improve Button quando há texto */}
                  {replyText && !generatingAI && (
                    <button
                      onClick={generateAIResponse}
                      className="w-11 h-11 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center hover:bg-violet-200 transition-colors"
                      title="Improve with AI"
                    >
                      <Wand2 className="h-5 w-5" strokeWidth={2} />
                    </button>
                  )}
                  
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="w-11 h-11 rounded-full bg-[#0E1E37] text-white flex items-center justify-center hover:bg-[#1a2f4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
            
            {/* Influencer Profile Panel */}
            <div className="hidden lg:flex w-[320px] xl:w-[380px] border-l border-gray-200 flex-col shrink-0">
              {selectedEmail.influencer ? (
                <InfluencerProfileCompact
                  influencerId={selectedEmail.influencer.id}
                  onUpdate={() => {
                    fetchEmails();
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50/30">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No influencer linked</p>
                  <p className="text-xs text-gray-400 mb-4">Associate an influencer to view profile</p>
                  <button
                    onClick={openInfluencerModal}
                    className="px-6 py-2.5 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Associate
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Estilos para conteúdo de chat */}
      <style jsx global>{`
        .chat-message-content {
          font-size: 15px;
          line-height: 1.6;
        }
        .chat-message-content p,
        .chat-message-content div {
          margin-bottom: 0.5em;
        }
        .chat-message-content div:empty,
        .chat-message-content p:empty {
          margin-bottom: 0.25em;
        }
        .chat-message-content a {
          text-decoration: underline;
          word-break: break-all;
        }
        .chat-message-content.prose-invert a {
          color: #93c5fd;
        }
        .chat-message-content blockquote {
          border-left: 2px solid currentColor;
          padding-left: 0.75rem;
          margin-left: 0;
          opacity: 0.8;
        }
      `}</style>
      
      {/* Modal para associar influencer */}
      {showInfluencerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Associar Influencer</h3>
              <button
                onClick={() => setShowInfluencerModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={influencerSearchQuery}
                  onChange={(e) => setInfluencerSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-gray-50 py-3 pl-11 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#0E1E37]/20 transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {availableInfluencers
                .filter(inf => inf.name.toLowerCase().includes(influencerSearchQuery.toLowerCase()))
                .map(influencer => (
                  <button
                    key={influencer.id}
                    onClick={() => associateInfluencer(influencer.id)}
                    disabled={associatingInfluencer}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#0E1E37] text-white flex items-center justify-center font-semibold text-sm">
                      {influencer.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{influencer.name}</p>
                      {influencer.email && <p className="text-xs text-gray-400 truncate">{influencer.email}</p>}
                    </div>
                    {associatingInfluencer && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
