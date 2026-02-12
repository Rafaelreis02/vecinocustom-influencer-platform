'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Search, AlertCircle, CheckCircle, Clock, X, RefreshCw,
  Reply, Trash2, Eye, EyeOff, Send, Paperclip, Inbox, Flag,
  Download, Sparkles, ChevronLeft, ChevronRight, UserPlus, AtSign,
  Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { StatusDropdown } from '@/components/StatusDropdown';
import { getWorkflowStatuses, getStatusConfig } from '@/lib/influencer-status';
import { InfluencerPanel } from '@/components/InfluencerPanel';

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
  attachments: any[];
  labels: string[];
}

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'inbox' | 'unread' | 'read' | 'sent' | 'flagged'>('inbox');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInboxDropdown, setShowInboxDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);
  const [availableInfluencers, setAvailableInfluencers] = useState<{id: string, name: string}[]>([]);
  const [associatingInfluencer, setAssociatingInfluencer] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 25;

  // Interface de Resposta
  const [showReplyPanel, setShowReplyPanel] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyCC, setReplyCC] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [signature, setSignature] = useState(''); 

  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmails();
    fetchUserSettings();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUserSettings() {
    try {
      const res = await fetch('/api/user/settings');
      const data = await res.json();
      if (data.emailSignature) setSignature(data.emailSignature);
      else setSignature('Com os melhores cumprimentos,\nEquipa VecinoCustom');
    } catch (e) {
      setSignature('Com os melhores cumprimentos,\nEquipa VecinoCustom');
    }
  }

  async function fetchEmails() {
    try {
      setLoading(true);
      const res = await fetch('/api/emails');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEmails(data);
    } catch (error: any) {
      addToast('Erro ao carregar mensagens', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailClick(email: Email) {
    try {
      setShowReplyPanel(false);
      setReplyText('');
      const res = await fetch(`/api/emails/${email.id}`);
      const data = await res.json();
      setSelectedEmail(data);
      setReplySubject(`Re: ${data.subject}`);
      
      if (!email.isRead) {
        await fetch(`/api/emails/${email.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        fetchEmails();
      }
    } catch (error: any) {
      addToast('Erro ao abrir email', 'error');
    }
  }

  async function generateAISuggestion() {
    if (!selectedEmail) return;
    try {
      setGeneratingAI(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}/suggest-reply`, { method: 'POST' });
      const data = await res.json();
      setReplyText(data.suggestion);
      setShowReplyPanel(true);
      setTimeout(() => replyRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      addToast('Sugestão de elite gerada!', 'success');
    } catch (error: any) {
      addToast('IA indisponível no momento', 'error');
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSendReply() {
    if (!selectedEmail || !replyText.trim()) return;
    try {
      setSendingReply(true);
      const historyHeader = `\n\n--- No dia ${new Date(selectedEmail.receivedAt).toLocaleDateString('pt-PT')}, ${selectedEmail.from} escreveu: ---\n`;
      const fullMessage = `${replyText}\n\n${signature}${historyHeader}${selectedEmail.body}`;
      
      const res = await fetch(`/api/emails/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: fullMessage,
          cc: replyCC,
          subject: replySubject
        }),
      });
      if (!res.ok) throw new Error();
      
      // Persistir assinatura se alterada
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSignature: signature }),
      });

      addToast('Email enviado com sucesso!', 'success');
      setShowReplyPanel(false);
      setReplyText('');
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao enviar email', 'error');
    } finally {
      setSendingReply(false);
    }
  }

  async function openInfluencerModal() {
    try {
      const res = await fetch('/api/influencers?limit=100');
      const data = await res.json();
      setAvailableInfluencers(data.influencers?.map((i: any) => ({ id: i.id, name: i.name })) || []);
      setShowInfluencerModal(true);
    } catch (error) {
      addToast('Erro ao carregar influencers', 'error');
    }
  }

  async function associateInfluencer(influencerId: string) {
    if (!selectedEmail) return;
    try {
      setAssociatingInfluencer(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId }),
      });
      if (!res.ok) throw new Error();
      
      // Refresh email details
      const emailRes = await fetch(`/api/emails/${selectedEmail.id}`);
      const emailData = await emailRes.json();
      setSelectedEmail(emailData);
      fetchEmails();
      
      addToast('Influencer associado com sucesso!', 'success');
      setShowInfluencerModal(false);
    } catch (error) {
      addToast('Erro ao associar influencer', 'error');
    } finally {
      setAssociatingInfluencer(false);
    }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', { method: 'POST' });
      const data = await res.json();
      addToast(`Sincronizados ${data.synced} novos emails`, 'success');
      fetchEmails();
    } catch (error: any) {
      addToast('Sincronização falhou', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleEmailFlag(emailId: string) {
    try {
      const res = await fetch(`/api/emails/${emailId}/toggle-flag`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error();
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao marcar flag', 'error');
    }
  }

  async function toggleEmailRead(emailId: string, isRead: boolean) {
    try {
      const res = await fetch(`/api/emails/${emailId}/mark-read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !isRead }),
      });
      if (!res.ok) throw new Error();
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao marcar lido/não-lido', 'error');
    }
  }

  async function deleteEmail(emailId: string) {
    if (!window.confirm('Tem certeza que quer eliminar este email?')) return;
    try {
      const res = await fetch(`/api/emails/${emailId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSelectedEmail(null);
      fetchEmails();
      addToast('Email eliminado', 'success');
    } catch (error: any) {
      addToast('Erro ao eliminar email', 'error');
    }
  }

  const filteredList = emails.filter(e => {
    if (filter === 'unread' && e.isRead) return false;
    if (filter === 'read' && !e.isRead) return false;
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
    <div className="h-[calc(100vh-64px)] bg-white overflow-hidden text-slate-900 font-sans">
      {/* Container Principal - Lista + Collapsive */}
      <div className="h-full flex">
        {/* Lista de Mensagens */}
        <div className={`${selectedEmail ? 'hidden md:flex md:w-[500px] lg:w-[600px] xl:w-[700px]' : 'flex w-full'} h-full flex-col border-r border-gray-200 bg-white shadow-sm z-10`}>
          {/* Header com Dropdowns */}
          <div className="p-3 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Pesquisar emails..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            {/* Dropdowns + Sync */}
            <div className="flex gap-2">
              {/* Botão Sincronizar */}
              <button 
                onClick={handleSyncNow} 
                disabled={syncing} 
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'rgb(18,24,39)' }}
                title="Sincronizar emails"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncing ? '...' : 'Sync'}</span>
              </button>
              
              {/* Dropdown Caixa de Entrada */}
              <div className="relative flex-1">
                <button 
                  onClick={() => {setShowInboxDropdown(!showInboxDropdown); setShowStatusDropdown(false);}}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <span className="flex items-center gap-2">
                    {filter === 'inbox' && <Inbox className="h-3.5 w-3.5" />}
                    {filter === 'unread' && <EyeOff className="h-3.5 w-3.5" />}
                    {filter === 'read' && <Eye className="h-3.5 w-3.5" />}
                    {filter === 'sent' && <Send className="h-3.5 w-3.5" />}
                    {filter === 'flagged' && <Flag className="h-3.5 w-3.5" />}
                    {filter === 'all' && <Mail className="h-3.5 w-3.5" />}
                    {filter === 'inbox' && 'Caixa de Entrada'}
                    {filter === 'unread' && 'Não lidas'}
                    {filter === 'read' && 'Lidas'}
                    {filter === 'sent' && 'Enviados'}
                    {filter === 'flagged' && 'Marcadas'}
                    {filter === 'all' && 'Todos'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showInboxDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showInboxDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                    {[
                      { key: 'inbox', label: 'Caixa de Entrada', icon: Inbox, count: emails.length },
                      { key: 'unread', label: 'Não lidas', icon: EyeOff, count: emails.filter(e => !e.isRead).length },
                      { key: 'read', label: 'Lidas', icon: Eye, count: emails.filter(e => e.isRead).length },
                      { key: 'sent', label: 'Enviados', icon: Send, count: 0 },
                      { key: 'flagged', label: 'Marcadas', icon: Flag, count: emails.filter(e => e.isFlagged).length },
                      { key: 'all', label: 'Todos', icon: Mail, count: emails.length },
                    ].map(({ key, label, icon: Icon, count }) => (
                      <button
                        key={key}
                        onClick={() => { setFilter(key as any); setShowInboxDropdown(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition ${filter === key ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600'}`}
                      >
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {label}</span>
                        <span className="text-slate-400">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Dropdown Status */}
              <div className="relative flex-1">
                <button 
                  onClick={() => {setShowStatusDropdown(!showStatusDropdown); setShowInboxDropdown(false);}}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {statusFilter === 'all' ? 'Todos status' : statusFilter}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition ${statusFilter === 'all' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Todos status
                    </button>
                    {['SUGGESTION', 'IMPORT_PENDING', 'ANALYZING', 'COUNTER_PROPOSAL', 'AGREED', 'PRODUCT_SELECTION', 'CONTRACT_PENDING', 'SHIPPED', 'COMPLETED'].map(status => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition ${statusFilter === status ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Lista de Emails - Uma linha */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
               <div className="p-8 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" /></div>
            ) : currentEmails.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-sm">Nenhuma mensagem encontrada</div>
            ) : (
              currentEmails.map(email => (
                <div 
                  key={email.id} 
                  onClick={() => handleEmailClick(email)} 
                  className={`group p-3 cursor-pointer hover:bg-slate-50 transition border-b border-slate-100 flex items-center gap-3 ${selectedEmail?.id === email.id ? 'bg-blue-50/50' : ''} ${!email.isRead ? 'bg-blue-50/20' : ''}`}
                >
                  {/* Avatar */}
                  {email.influencer?.avatarUrl ? (
                    <img 
                      src={email.influencer.avatarUrl} 
                      alt={email.influencer.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {email.from.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Info principal */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {/* Nome */}
                    <span className={`w-32 truncate text-sm ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {email.from.split('@')[0]}
                    </span>
                    
                    {/* Status badge */}
                    {email.influencer ? (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase whitespace-nowrap">
                        {email.influencer.status || 'Sem status'}
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase whitespace-nowrap">
                        Sem influencer
                      </span>
                    )}
                    
                    {/* Assunto */}
                    <span className={`flex-1 truncate text-sm ${!email.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {email.subject}
                    </span>
                  </div>
                  
                  {/* Ações + Data */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Flag */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleEmailFlag(email.id); }}
                      className="p-1.5 hover:bg-slate-200 rounded transition opacity-0 group-hover:opacity-100"
                      title={email.isFlagged ? 'Remover flag' : 'Adicionar flag'}
                    >
                      <Flag className={`h-3.5 w-3.5 ${email.isFlagged ? 'fill-yellow-400 text-yellow-500' : 'text-slate-300'}`} />
                    </button>
                    
                    {/* Lido/Não lido */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleEmailRead(email.id, email.isRead); }}
                      className="p-1.5 hover:bg-slate-200 rounded transition opacity-0 group-hover:opacity-100"
                      title={email.isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                    >
                      {email.isRead ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-blue-500" />}
                    </button>
                    
                    {/* Data */}
                    <span className="text-[11px] text-slate-400 w-14 text-right">
                      {new Date(email.receivedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 bg-white flex items-center justify-between">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        {/* Collapsive Direito - Quando Email Selecionado */}
        {selectedEmail && (
          <div className="absolute inset-0 md:static md:relative md:flex-1 md:h-full flex flex-row bg-white z-50 md:z-10 animate-in slide-in-from-right duration-300">
            {/* Influencer Panel (30%) - Desktop only */}
            <div className="hidden md:flex w-[30%] min-w-[280px] max-w-[350px] border-r border-gray-200 flex-col h-full overflow-hidden">
              {selectedEmail.influencer ? (
                <InfluencerPanel influencer={selectedEmail.influencer} />
              ) : (
                <div className="h-full bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                    <UserPlus className="h-8 w-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">Sem influencer associado</p>
                    <p className="text-xs text-slate-400">Adiciona um influencer a este email</p>
                  </div>
                  <button 
                    onClick={openInfluencerModal}
                    className="px-4 py-2 rounded-lg font-bold text-xs text-white hover:opacity-90 transition"
                    style={{ backgroundColor: 'rgb(18,24,39)' }}
                  >
                    + Adicionar Influencer
                  </button>
                </div>
              )}
            </div>

            {/* Email Detail + Reply (70%) */}
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white">
              {/* Header */}
              <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button onClick={() => setSelectedEmail(null)} className="md:hidden flex items-center gap-1 text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-sm">Voltar</span>
                  </button>
                  {/* Desktop close button */}
                  <button onClick={() => setSelectedEmail(null)} className="hidden md:block p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {selectedEmail.from.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedEmail.from}</p>
                    <p className="text-[10px] text-slate-400">{new Date(selectedEmail.receivedAt).toLocaleString('pt-PT')}</p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => toggleEmailRead(selectedEmail.id, selectedEmail.isRead)}
                    className="p-2 text-slate-400 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition"
                    title={selectedEmail.isRead ? 'Marcar como não-lido' : 'Marcar como lido'}
                  >
                    {selectedEmail.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => toggleEmailFlag(selectedEmail.id)}
                    className="p-2 text-slate-400 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition"
                    title={selectedEmail.isFlagged ? 'Remover flag' : 'Adicionar flag'}
                  >
                    <Flag className={`h-4 w-4 ${selectedEmail.isFlagged ? 'fill-blue-600 text-blue-600' : ''}`} />
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail.id)} className="p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Conteúdo da Mensagem */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <h1 className="text-xl font-black text-slate-900 mb-6">{selectedEmail.subject}</h1>
                  
                  {selectedEmail.htmlBody ? (
                    <div className="prose prose-blue max-w-none text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
                  ) : (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
                  )}

                  {/* Anexos */}
                  {selectedEmail.attachments?.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Anexos ({selectedEmail.attachments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att, idx) => (
                          <button key={idx} onClick={() => window.open(`/api/emails/${selectedEmail.id}/attachments/${att.attachmentId}`)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 transition text-xs font-semibold text-slate-600">
                            <Download className="h-3 w-3" /> {att.filename}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Reply Footer */}
              <div className="border-t border-gray-100 bg-white">
                {showReplyPanel ? (
                  <div className="p-4 max-h-80 overflow-y-auto">
                    <div className="max-w-3xl mx-auto space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responder</span>
                        <button onClick={() => setShowReplyPanel(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="h-4 w-4" /></button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <input value={replySubject} onChange={e => setReplySubject(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Assunto" />
                        <input value={replyCC} onChange={e => setReplyCC(e.target.value)} placeholder="CC" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={generateAISuggestion}
                          disabled={generatingAI}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-200 transition disabled:opacity-50"
                        >
                          {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Sugestão IA
                        </button>
                      </div>

                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreve a tua mensagem..."
                        className="w-full h-20 p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />

                      <div className="flex gap-2">
                        <button 
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                          className="flex-1 py-2 rounded-lg font-bold text-sm text-white hover:opacity-90 transition disabled:bg-slate-300 flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'rgb(18,24,39)' }}
                        >
                          <Send className="h-4 w-4" /> {sendingReply ? 'A enviar...' : 'Enviar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 px-6 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Pronto para responder?</span>
                    <button 
                      onClick={() => setShowReplyPanel(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-200 transition"
                    >
                      <Reply className="h-4 w-4" /> Responder
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio - só aparece em desktop quando não há email selecionado E não há emails na lista */}
        {!selectedEmail && currentEmails.length === 0 && !loading && (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 p-12 text-center bg-slate-50/20">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <Mail className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Centro de Mensagens</h3>
            <p className="text-sm max-w-xs mt-2 font-medium">Seleciona uma conversa para começar a gerir as tuas parcerias.</p>
          </div>
        )}
      </div>

      {/* Modal para associar influencer */}
      {showInfluencerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Associar Influencer</h3>
              <button onClick={() => setShowInfluencerModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableInfluencers.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum influencer encontrado</p>
              ) : (
                <div className="space-y-2">
                  {availableInfluencers.map(inf => (
                    <button
                      key={inf.id}
                      onClick={() => associateInfluencer(inf.id)}
                      disabled={associatingInfluencer}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition text-left border border-slate-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        {inf.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-700">{inf.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
