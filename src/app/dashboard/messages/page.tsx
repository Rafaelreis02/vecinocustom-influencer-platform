'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Search, AlertCircle, CheckCircle, Clock, X, RefreshCw,
  Reply, Trash2, Eye, EyeOff, Send, Paperclip, Inbox, Flag,
  Download, Sparkles, ChevronLeft, ChevronRight, UserPlus, AtSign
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';
import { StatusDropdown } from '@/components/StatusDropdown';
import { getWorkflowStatuses, getStatusConfig } from '@/lib/influencer-status';

interface Email {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged: boolean;
  body?: string;
  influencer?: { id: string; name: string; status?: string } | null;
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
  const [filter, setFilter] = useState<'inbox' | 'unread' | 'flagged'>('inbox');
  
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

  const filteredList = emails.filter(e => {
    if (filter === 'unread' && e.isRead) return false;
    if (filter === 'flagged' && !e.isFlagged) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / emailsPerPage);
  const currentEmails = filteredList.slice((currentPage - 1) * emailsPerPage, currentPage * emailsPerPage);

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] bg-white overflow-hidden text-slate-900 font-sans">
      {/* Sidebar de Navegação */}
      <div className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-slate-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button onClick={handleSyncNow} disabled={syncing} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition active:scale-95 disabled:bg-gray-400 shadow-md">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'A Sincronizar...' : 'Sincronizar Gmail'}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            <button onClick={() => setFilter('inbox')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${filter === 'inbox' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Inbox className="h-4 w-4" /> Caixa de Entrada <span className="ml-auto text-xs bg-white/50 px-2 py-0.5 rounded-full">{emails.length}</span>
            </button>
            <button onClick={() => setFilter('unread')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${filter === 'unread' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
              <EyeOff className="h-4 w-4" /> Não Lidas <span className="ml-auto text-xs bg-white/50 px-2 py-0.5 rounded-full">{emails.filter(e => !e.isRead).length}</span>
            </button>
            <button onClick={() => setFilter('flagged')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${filter === 'flagged' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Flag className="h-4 w-4" /> Marcadas <span className="ml-auto text-xs bg-white/50 px-2 py-0.5 rounded-full">{emails.filter(e => e.isFlagged).length}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Lista de Mensagens */}
      <div className={`w-full md:w-96 flex flex-col border-r border-gray-200 bg-white shadow-sm z-10 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
             <div className="p-8 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" /></div>
          ) : currentEmails.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">Nenhuma mensagem encontrada</div>
          ) : (
            currentEmails.map(email => (
              <div key={email.id} onClick={() => handleEmailClick(email)} className={`p-4 cursor-pointer hover:bg-slate-50 transition border-l-4 ${selectedEmail?.id === email.id ? 'bg-blue-50/50 border-l-blue-600' : 'border-l-transparent'} ${!email.isRead ? 'bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs truncate max-w-[180px] ${!email.isRead ? 'font-bold text-blue-900' : 'text-slate-500'}`}>{email.from}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{new Date(email.receivedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}</span>
                </div>
                <p className={`text-sm line-clamp-1 ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{email.subject}</p>
                {email.influencer && <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-tight">{email.influencer.name}</div>}
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

      {/* Área de Visualização e Resposta */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {selectedEmail ? (
          <>
            {/* Header da Mensagem (Sticky) */}
            <div className="p-4 md:px-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-20 shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">←</button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-white">{selectedEmail.from.charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedEmail.from}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(selectedEmail.receivedAt).toLocaleString('pt-PT')}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowReplyPanel(true)}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg active:scale-95"
                >
                  <Reply className="h-4 w-4" /> Responder
                </button>
                <button onClick={() => window.confirm('Eliminar esta conversa?') && fetch(`/api/emails/${selectedEmail.id}`, { method: 'DELETE' }).then(() => setSelectedEmail(null))} className="p-2.5 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Mensagem */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 leading-tight">{selectedEmail.subject}</h1>
                
                {selectedEmail.htmlBody ? (
                  <div className="prose prose-blue max-w-none text-slate-800 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
                ) : (
                  <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
                )}

                {/* Anexos */}
                {selectedEmail.attachments?.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Anexos ({selectedEmail.attachments.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, idx) => (
                        <button key={idx} onClick={() => window.open(`/api/emails/${selectedEmail.id}/attachments/${att.attachmentId}`)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition text-xs font-bold text-slate-600">
                          <Download className="h-3.5 w-3.5" /> {att.filename}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Painel de Resposta Embutido */}
                <div ref={replyRef} className={`mt-12 transition-all duration-700 ease-in-out transform ${showReplyPanel ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 translate-y-10 h-0 overflow-hidden'}`}>
                  <div className="bg-slate-50 rounded-3xl border-2 border-blue-50 p-6 md:p-8 shadow-2xl shadow-blue-900/5 mb-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30"><Reply className="h-5 w-5" /></div>
                        <span className="font-black text-slate-900 uppercase tracking-tighter">Resposta Rápida</span>
                      </div>
                      <button onClick={() => setShowReplyPanel(false)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400"><X className="h-5 w-5" /></button>
                    </div>

                    <div className="space-y-5">
                      {/* Campos Avançados */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><AtSign className="h-3 w-3" /> Assunto</label>
                          <input value={replySubject} onChange={e => setReplySubject(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Cópia (CC)</label>
                          <input value={replyCC} onChange={e => setReplyCC(e.target.value)} placeholder="email@exemplo.com" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>

                      {/* Botão Sugestão IA Proeminente */}
                      <button 
                        onClick={generateAISuggestion}
                        disabled={generatingAI}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-2xl text-base font-black hover:opacity-90 transition disabled:opacity-50 shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                      >
                        {generatingAI ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                        {generatingAI ? 'A Pensar na Resposta...' : 'Gerar Sugestão Inteligente (Gemini)'}
                      </button>

                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreve a tua mensagem aqui ou usa a IA acima..."
                        className="w-full min-h-[300px] p-6 bg-white border border-slate-200 rounded-3xl text-base focus:ring-2 focus:ring-blue-500 outline-none shadow-inner resize-none leading-relaxed"
                      />

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tua Assinatura (Editável)</label>
                        <textarea 
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          className="w-full p-4 bg-white/50 border border-dashed border-slate-300 rounded-2xl text-xs text-slate-500 italic outline-none focus:border-blue-400 transition-colors"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-4">
                        <div className="flex gap-2">
                           <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition shadow-sm"><Paperclip className="h-5 w-5" /></button>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => setShowReplyPanel(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest">Cancelar</button>
                          <button 
                            onClick={handleSendReply}
                            disabled={sendingReply || !replyText.trim()}
                            className="flex items-center gap-3 px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-base hover:bg-blue-700 transition shadow-2xl shadow-blue-600/30 disabled:bg-slate-300 active:scale-95"
                          >
                            <Send className="h-5 w-5" /> {sendingReply ? 'A ENVIAR...' : 'ENVIAR AGORA'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-slate-50/20">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <Mail className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Centro de Mensagens</h3>
            <p className="text-sm max-w-xs mt-2 font-medium">Seleciona uma conversa para começar a gerir as tuas parcerias.</p>
          </div>
        )}
      </div>
    </div>
  );
}
