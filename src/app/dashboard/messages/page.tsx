'use client';

import { useState, useEffect, useRef } from 'react';
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
  Flag,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserPlus
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

  // Resposta e IA
  const [showReplyPanel, setShowReplyPanel] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [signature, setSignature] = useState('Aguarde...'); // Carregada do user

  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmails();
    fetchSignature();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSignature() {
    try {
      const res = await fetch('/api/user/settings');
      const data = await res.json();
      if (data.emailSignature) setSignature(data.emailSignature);
    } catch (e) {
      setSignature('Com os melhores cumprimentos,\nEquipa VecinoCustom');
    }
  }

  async function fetchEmails() {
    try {
      setLoading(true);
      const res = await fetch('/api/emails');
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
      addToast('Sugestão gerada!', 'success');
    } catch (error: any) {
      addToast('IA indisponível', 'error');
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleSendReply() {
    if (!selectedEmail || !replyText.trim()) return;
    try {
      setSendingReply(true);
      const fullMessage = `${replyText}\n\n${signature}`;
      const res = await fetch(`/api/emails/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullMessage }),
      });
      if (!res.ok) throw new Error();
      
      // Guardar assinatura se alterada
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSignature: signature }),
      });

      addToast('Email enviado!', 'success');
      setShowReplyPanel(false);
      setReplyText('');
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao enviar', 'error');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', { method: 'POST' });
      const data = await res.json();
      addToast(`${data.synced} novos emails`, 'success');
      fetchEmails();
    } catch (error: any) {
      addToast('Erro na sincronização', 'error');
    } finally {
      setSyncing(false);
    }
  }

  // Lógica de Filtro e Paginação
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
    <div className="flex h-[calc(100vh-theme(spacing.16))] bg-white overflow-hidden text-slate-900">
      {/* Coluna Esquerda: Filtros e Lista */}
      <div className="w-full md:w-96 flex flex-col border-r border-gray-200 bg-slate-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button onClick={handleSyncNow} disabled={syncing} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:bg-gray-400 shadow-sm">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'A Sincronizar...' : 'Sincronizar Gmail'}
          </button>
          
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Procurar mensagens..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {/* Abas de Filtro */}
        <div className="flex p-2 gap-1 bg-white border-b border-gray-200">
          <button onClick={() => setFilter('inbox')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${filter === 'inbox' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>Inbox</button>
          <button onClick={() => setFilter('unread')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>Não Lidas</button>
          <button onClick={() => setFilter('flagged')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${filter === 'flagged' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>Marcadas</button>
        </div>

        {/* Lista de Emails com Paginação */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="p-8 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" /></div>
          ) : currentEmails.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">Nenhum email encontrado</div>
          ) : (
            currentEmails.map(email => (
              <div key={email.id} onClick={() => handleEmailClick(email)} className={`p-4 cursor-pointer hover:bg-white transition border-b border-gray-100 border-l-4 ${selectedEmail?.id === email.id ? 'bg-white border-l-blue-600 shadow-sm' : 'border-l-transparent'} ${!email.isRead ? 'bg-blue-50/50' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs truncate max-w-[180px] ${!email.isRead ? 'font-bold text-blue-900' : 'text-slate-500'}`}>{email.from}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(email.receivedAt).toLocaleDateString('pt-PT')}</span>
                </div>
                <p className={`text-sm line-clamp-1 ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{email.subject}</p>
                {email.influencer && <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase">{email.influencer.name}</div>}
              </div>
            ))
          )}
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 bg-white flex items-center justify-between">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-bold text-slate-500">Página {currentPage} de {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {/* Coluna Direita: Conteúdo e Resposta */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {selectedEmail ? (
          <>
            {/* Header do Email */}
            <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">←</button>
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">{email.from.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedEmail.from}</p>
                  <p className="text-xs text-slate-500">Assunto: {selectedEmail.subject}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowReplyPanel(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md"
                >
                  <Reply className="h-4 w-4" /> Responder
                </button>
              </div>
            </div>

            {/* Corpo do Email */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-black text-slate-900 mb-8 leading-tight">{selectedEmail.subject}</h1>
                {selectedEmail.htmlBody ? (
                  <div className="prose prose-blue max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
                ) : (
                  <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
                )}
                
                {/* Painel de Resposta Collapsible */}
                <div ref={replyRef} className={`mt-12 transition-all duration-500 overflow-hidden ${showReplyPanel ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-slate-50 rounded-2xl border-2 border-blue-100 p-6 shadow-sm mb-20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white"><Reply className="h-5 w-5" /></div>
                        <span className="font-bold text-slate-900">A responder a {selectedEmail.from}</span>
                      </div>
                      <button onClick={() => setShowReplyPanel(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="h-5 w-5" /></button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={generateAISuggestion}
                          disabled={generatingAI}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                        >
                          {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Gerar Resposta com IA
                        </button>
                      </div>

                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreve a tua mensagem aqui..."
                        className="w-full min-h-[200px] p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-inner resize-none"
                      />

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Assinatura</label>
                        <textarea 
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          className="w-full p-3 bg-white/50 border border-slate-200 rounded-lg text-xs text-slate-600 italic outline-none focus:border-blue-300"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowReplyPanel(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                        <button 
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                          className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg disabled:bg-slate-300"
                        >
                          <Send className="h-4 w-4" /> {sendingReply ? 'A enviar...' : 'Enviar Agora'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botão Responder Fixo (Mobile) ou quando painel fechado */}
            {!showReplyPanel && (
              <div className="md:hidden p-4 border-t border-gray-100 bg-white">
                <button 
                  onClick={() => setShowReplyPanel(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg"
                >
                  <Reply className="h-5 w-5" /> Responder
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-slate-50/30">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Mail className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Caixa de Entrada</h3>
            <p className="text-sm max-w-xs mt-2">Seleciona uma mensagem na lista ao lado para ler e responder.</p>
          </div>
        )}
      </div>
    </div>
  );
}
