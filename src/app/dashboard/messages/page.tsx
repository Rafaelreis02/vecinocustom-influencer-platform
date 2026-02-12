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
  Flag,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
  influencer?: { id: string; name: string; fitScore?: number; tier?: string; status?: string } | null;
}

interface EmailDetail extends Email {
  to: string;
  body: string;
  htmlBody?: string;
  attachments: any[];
  labels: string[];
}

type FilterType = 'inbox' | 'unread' | 'flagged';
type StatusFilterType = 'all' | string;

export default function MessagesPage() {
  const { addToast } = useGlobalToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('inbox');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  
  // States para Resposta Inline
  const [showReplyPanel, setShowReplyPanel] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [signature, setSignature] = useState('Com os melhores cumprimentos,\nEquipa VecinoCustom');

  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [fullInfluencer, setFullInfluencer] = useState<any>(null);
  const [loadingInfluencer, setLoadingInfluencer] = useState(false);
  const [showAddInfluencerModal, setShowAddInfluencerModal] = useState(false);
  const [influencerUsername, setInfluencerUsername] = useState('');
  const [influencerPlatform, setInfluencerPlatform] = useState<'TikTok' | 'Instagram'>('TikTok');
  const [addingInfluencer, setAddingInfluencer] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sendingCompose, setSendingCompose] = useState(false);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
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
      setShowReplyPanel(false); // Reset panel ao trocar email
      setReplyText('');
      
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

  async function generateAISuggestion() {
    if (!selectedEmail) return;
    
    try {
      setGeneratingAI(true);
      const res = await fetch(`/api/emails/${selectedEmail.id}/suggest-reply`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('IA falhou ao gerar sugestão');
      
      const data = await res.json();
      setReplyText(data.suggestion);
      setShowReplyPanel(true);
      addToast('Sugestão gerada pela IA!', 'success');
    } catch (error: any) {
      addToast('Erro na IA: ' + error.message, 'error');
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

      if (!res.ok) throw new Error('Failed to send reply');

      addToast('Resposta enviada com sucesso', 'success');
      setReplyText('');
      setShowReplyPanel(false);
      fetchEmails();
    } catch (error: any) {
      addToast('Erro ao enviar: ' + error.message, 'error');
    } finally {
      setSendingReply(false);
    }
  }

  // ... (Outras funções auxiliares mantidas para não estragar nada)

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
      fetchEmails();
    } catch (error: any) { addToast('Erro: ' + error.message, 'error'); }
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
    } catch (error: any) { addToast('Erro: ' + error.message, 'error'); }
  }

  async function handleDelete() {
    if (!selectedEmail) return;
    if (!window.confirm('Eliminar este email?')) return;
    try {
      await fetch(`/api/emails/${selectedEmail.id}`, { method: 'DELETE' });
      addToast('Email eliminado', 'success');
      setSelectedEmail(null);
      fetchEmails();
    } catch (error: any) { addToast('Erro: ' + error.message, 'error'); }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      const res = await fetch('/api/worker/sync-emails', { method: 'POST' });
      const data = await res.json();
      addToast(`Sincronizados ${data.synced} emails`, 'success');
      fetchEmails();
    } catch (error: any) { addToast('Erro: ' + error.message, 'error'); } finally { setSyncing(false); }
  }

  function getInitials(email: string) { return email.split('@')[0].slice(0, 2).toUpperCase(); }
  function getAvatarColor(email: string) {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  const filteredEmails = emails.filter((email) => {
    if (filter === 'unread' && email.isRead) return false;
    if (filter === 'flagged' && !email.isFlagged) return false;
    if (statusFilter !== 'all' && email.influencer?.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return email.subject.toLowerCase().includes(q) || email.from.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar de Filtros */}
      <div className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200 space-y-2">
          <button onClick={() => setShowComposeModal(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition">
            <Mail className="h-4 w-4" /> Novo Email
          </button>
          <button onClick={handleSyncNow} disabled={syncing} className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 transition">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'A sincronizar...' : 'Sincronizar'}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button onClick={() => setFilter('inbox')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${filter === 'inbox' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Inbox className="h-4 w-4" /> Inbox <span className="ml-auto text-xs opacity-60">{emails.length}</span>
          </button>
          <button onClick={() => setFilter('unread')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${filter === 'unread' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <EyeOff className="h-4 w-4" /> Por ler <span className="ml-auto text-xs opacity-60">{emails.filter(e => !e.isRead).length}</span>
          </button>
          <button onClick={() => setFilter('flagged')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${filter === 'flagged' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Flag className="h-4 w-4" /> Marcados <span className="ml-auto text-xs opacity-60">{emails.filter(e => e.isFlagged).length}</span>
          </button>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Por Estado</p>
            {getWorkflowStatuses().map(status => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${statusFilter === status ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span className={`h-2 w-2 rounded-full ${getStatusConfig(status).dotColor}`} /> {getStatusConfig(status).label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Lista de Emails */}
      <div className={`w-full md:w-96 flex flex-col border-r border-gray-200 bg-white ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredEmails.map(email => (
            <div key={email.id} onClick={() => handleEmailClick(email)} className={`p-4 cursor-pointer hover:bg-gray-50 transition border-l-4 ${selectedEmail?.id === email.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'} ${!email.isRead ? 'font-bold' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-gray-500 truncate max-w-[150px]">{email.from}</span>
                <span className="text-[10px] text-gray-400">{new Date(email.receivedAt).toLocaleDateString('pt-PT')}</span>
              </div>
              <p className="text-sm text-gray-900 line-clamp-1">{email.subject}</p>
              {email.influencer && <span className="mt-2 inline-block px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-tighter">{email.influencer.name}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe do Email */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {selectedEmail ? (
          <>
            {/* Toolbar Detalhe */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-20">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">←</button>
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedEmail.from)} text-white flex items-center justify-center font-bold`}>{getInitials(selectedEmail.from)}</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedEmail.from}</p>
                  <p className="text-xs text-gray-500">Para: {selectedEmail.to}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleToggleFlag} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Flag className={`h-5 w-5 ${selectedEmail.isFlagged ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                </button>
                <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Email */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedEmail.subject}</h2>
              {selectedEmail.htmlBody ? (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</p>
              )}
            </div>

            {/* PAINEL DE RESPOSTA INLINE (NOVO) */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              {!showReplyPanel ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReplyPanel(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition shadow-sm"
                  >
                    <Reply className="h-4 w-4" /> Responder Manualmente
                  </button>
                  <button
                    onClick={generateAISuggestion}
                    disabled={generatingAI}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:bg-blue-400"
                  >
                    {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 
                    Sugestão IA
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-2">
                      <Reply className="h-3 w-3" /> A responder a {selectedEmail.from}
                    </span>
                    <button onClick={() => setShowReplyPanel(false)} className="p-1 hover:bg-gray-200 rounded-full">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreve a tua mensagem..."
                    className="w-full min-h-[150px] p-4 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                  />
                  
                  <div className="bg-gray-200/50 p-3 rounded-lg border border-gray-300 border-dashed">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Assinatura Automática</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap italic">{signature}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-500">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={generateAISuggestion}
                        disabled={generatingAI}
                        title="Regerar com IA"
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                      >
                        <Sparkles className={`h-5 w-5 ${generatingAI ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        <Send className="h-4 w-4" /> {sendingReply ? 'A enviar...' : 'Enviar Resposta'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-10 w-10 opacity-20" />
            </div>
            <p className="text-lg font-medium text-gray-500">Seleciona uma conversa</p>
            <p className="text-sm opacity-60">Gere as tuas parcerias e contactos num só lugar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
