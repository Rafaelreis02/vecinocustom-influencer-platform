'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Send, Image as ImageIcon, CheckCircle, X, ChevronRight } from 'lucide-react';

interface DesignMessage {
  id: string;
  content: string;
  imageUrl?: string;
  senderType: 'ADMIN' | 'INFLUENCER';
  createdAt: string;
}

interface Workflow {
  id: string;
  designApproved: boolean;
  designRevisionCount: number;
}

interface PartnershipStep4Props {
  workflow: Workflow;
  isLocked: boolean;
  onAdvance?: () => void;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Componente atualizado v2 - Chat moderno
export function PartnershipStep4({ workflow, isLocked, onAdvance }: PartnershipStep4Props) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [workflow.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/partnerships/${workflow.id}/design-messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('A imagem deve ter menos de 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('O ficheiro deve ser uma imagem');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      setImageUrl(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setUploadedImage(null);
    setImageUrl('');
    setUploadError(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !imageUrl) return;

    try {
      setIsSending(true);
      
      let finalImageUrl = imageUrl;
      if (uploadedImage && uploadedImage.startsWith('data:')) {
        const uploadRes = await fetch('/api/upload/design-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: uploadedImage }),
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        }
      }
      
      const res = await fetch(`/api/partnerships/${workflow.id}/design-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, imageUrl: finalImageUrl }),
      });

      if (res.ok) {
        setNewMessage('');
        setImageUrl('');
        setUploadedImage(null);
        await fetchMessages();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Server error:', errorData);
        setUploadError(errorData.error || 'Erro ao enviar mensagem');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setUploadError('Erro de rede ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
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
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, DesignMessage[]>, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            💬 Chat de Design
          </h3>
          <p className="text-sm text-gray-500">
            Comunica com o influencer sobre o design/mockup
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          workflow.designApproved 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {workflow.designApproved ? '✅ Aprovado' : `⏳ Em revisão (${workflow.designRevisionCount})`}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8" />
            </div>
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Envia o mockup do design para começar</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-3">
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {formatDate(dateMessages[0].createdAt)}
                </span>
              </div>
              
              {dateMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[85%] ${
                    msg.senderType === 'ADMIN' ? 'flex-row-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      msg.senderType === 'ADMIN' 
                        ? 'bg-black text-white' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {msg.senderType === 'ADMIN' ? 'VC' : 'IN'}
                    </div>
                    
                    {/* Message bubble */}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      msg.senderType === 'ADMIN'
                        ? 'bg-black text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
                    }`}>
                      {msg.imageUrl && (
                        <a 
                          href={msg.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mb-2"
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Design"
                            className="rounded-lg max-w-[250px] max-h-[200px] object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <span className={`text-xs mt-1 block ${
                        msg.senderType === 'ADMIN' ? 'text-gray-400' : 'text-gray-400'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Approved State */}
      {workflow.designApproved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-900">Design aprovado!</p>
              <p className="text-sm text-green-700">
                O influencer já aprovou o design. Podes avançar para o contrato.
              </p>
            </div>
            {onAdvance && !isLocked && (
              <button
                onClick={onAdvance}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Avançar
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isLocked && !workflow.designApproved && (
        <div className="border-t border-gray-200 pt-4">
          {/* Image Preview */}
          {uploadedImage && (
            <div className="relative mb-3 inline-block">
              <img
                src={uploadedImage}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            {/* Image Upload Button */}
            <label className="flex-shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => {}}
              >
                <ImageIcon className="h-5 w-5" />
              </button>
            </label>
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreve uma mensagem..."
                rows={1}
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-black focus:bg-white resize-none min-h-[48px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            
            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={isSending || (!newMessage.trim() && !imageUrl) || !!uploadError}
              className="flex-shrink-0 p-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {uploadError && (
            <p className="text-xs text-red-600 mt-2 ml-12">{uploadError}</p>
          )}
          <p className="text-xs text-gray-400 mt-2 ml-12">
            Pressiona Enter para enviar • Máx. 5MB
          </p>
        </div>
      )}
    </div>
  );
}
