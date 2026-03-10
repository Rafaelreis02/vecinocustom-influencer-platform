'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Send, Image as ImageIcon, CheckCircle, X, Eye } from 'lucide-react';

interface DesignMessage {
  id: string;
  content: string;
  imageUrl?: string;
  senderType: 'ADMIN' | 'INFLUENCER';
  createdAt: string;
}

interface Workflow {
  id: string;
  designReferenceUrl: string | null;
  designReferenceSubmittedAt: string | null;
  designApproved: boolean;
  designRevisionCount: number;
}

interface PartnershipStep4Props {
  workflow: Workflow;
  isLocked: boolean;
  onAdvance?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function PartnershipStep4({ workflow, isLocked, onAdvance }: PartnershipStep4Props) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [workflow.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/partnerships/${workflow.id}/design-messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
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
    setFileInputKey(Date.now());
    
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('A imagem deve ter menos de 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isImage) {
      setUploadError('O ficheiro deve ser uma imagem');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setUploadedImage(null);
    setUploadError(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !uploadedImage) return;

    try {
      setIsSending(true);
      
      let finalImageUrl = null;
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
        setUploadedImage(null);
        await fetchMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasReference = messages.some(m => m.senderType === 'INFLUENCER');
  const hasMockups = messages.some(m => m.senderType === 'ADMIN');

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Step 4: Design Review</h3>
          <p className="text-sm text-gray-500">
            {!hasReference 
              ? 'Aguardando referência do influencer'
              : !hasMockups 
                ? 'Referência recebida. Envia as provas do design'
                : workflow.designApproved 
                  ? 'Design aprovado!'
                  : 'Aguardando aprovação do influencer'
            }
          </p>
        </div>
        {workflow.designApproved && (
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ✅ Aprovado
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ImageIcon className="h-12 w-12 mb-3" />
            <p className="text-sm">Aguardando referência do influencer...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.senderType === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.senderType === 'ADMIN' ? 'bg-black text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  {msg.senderType === 'ADMIN' ? 'VC' : 'IN'}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.senderType === 'ADMIN'
                    ? 'bg-black text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
                }`}>
                  {msg.imageUrl && (
                    <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
                      <img src={msg.imageUrl} alt="Design" className="rounded-lg max-w-[250px] max-h-[200px] object-cover hover:opacity-90" />
                    </a>
                  )}
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  <span className="text-xs opacity-60 mt-1 block">
                    {new Date(msg.createdAt).toLocaleString('pt-PT')}
                  </span>
                </div>
              </div>
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
              <p className="text-sm text-green-700">O influencer aprovou o design.</p>
            </div>
            {onAdvance && !isLocked && (
              <button
                onClick={onAdvance}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Avançar para Contrato
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isLocked && !workflow.designApproved && hasReference && (
        <div className="border-t border-gray-200 pt-4">
          {uploadedImage && (
            <div className="relative mb-3 inline-block">
              <img src={uploadedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border" />
              <button onClick={clearImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <label htmlFor="admin-image-upload" className="flex-shrink-0 cursor-pointer">
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                id="admin-image-upload"
              />
              <div className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <ImageIcon className="h-5 w-5" />
              </div>
            </label>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreve uma mensagem..."
                rows={1}
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-black focus:bg-white resize-none"
                style={{ height: 'auto' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            
            <button
              onClick={sendMessage}
              disabled={isSending || (!newMessage.trim() && !uploadedImage) || !!uploadError}
              className="flex-shrink-0 p-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          
          {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
        </div>
      )}

      {!hasReference && !isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Aguardando referência do influencer. Assim que enviar, podes responder com as provas do design.
          </p>
        </div>
      )}
    </div>
  );
}
