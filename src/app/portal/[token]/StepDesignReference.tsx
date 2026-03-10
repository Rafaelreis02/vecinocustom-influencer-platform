'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, RefreshCw, Send, Image as ImageIcon, X, Upload } from 'lucide-react';

interface DesignMessage {
  id: string;
  content: string;
  imageUrl?: string;
  senderType: 'ADMIN' | 'INFLUENCER';
  createdAt: string;
}

interface StepDesignReferenceProps {
  token: string;
  onApprove: () => void;
  designReferenceUrl?: string | null;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function StepDesignReference({ token, onApprove, designReferenceUrl }: StepDesignReferenceProps) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [hasSubmittedReference, setHasSubmittedReference] = useState(!!designReferenceUrl);

  // Fetch messages
  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/portal/${token}/design-messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
        // Check if influencer already sent a message (reference)
        const influencerMessages = data.data?.filter((m: DesignMessage) => m.senderType === 'INFLUENCER');
        if (influencerMessages?.length > 0) {
          setHasSubmittedReference(true);
        }
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

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isImage) {
      setUploadError('O ficheiro deve ser uma imagem (JPG, PNG, GIF, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o ficheiro. Tenta novamente.');
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setUploadedImage(null);
    setUploadError(null);
  };

  const handleSubmitReference = async () => {
    if (!uploadedImage) {
      setError('Por favor, envia uma imagem de referência');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Upload image
      let finalImageUrl = uploadedImage;
      if (uploadedImage.startsWith('data:')) {
        const uploadRes = await fetch('/api/upload/design-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: uploadedImage }),
        });

        if (!uploadRes.ok) {
          setError('Erro ao fazer upload da imagem');
          setIsSubmitting(false);
          return;
        }

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }

      // Submit as design message (reference)
      const res = await fetch(`/api/portal/${token}/send-design-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: 'Esta é a minha referência para o design',
          imageUrl: finalImageUrl 
        }),
      });

      const data = await res.json();
      if (data.success) {
        setHasSubmittedReference(true);
        setUploadedImage(null);
        await fetchMessages();
      } else {
        setError(data.error || 'Erro ao enviar referência');
      }
    } catch (err) {
      console.error('Error submitting reference:', err);
      setError('Erro de rede ao enviar referência');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!newMessage.trim() && !uploadedImage) {
      setError('Escreve uma mensagem ou envia uma imagem');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
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
      
      const res = await fetch(`/api/portal/${token}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage, imageUrl: finalImageUrl }),
      });
      
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setUploadedImage(null);
        await fetchMessages();
      } else {
        setError(data.error || 'Erro ao solicitar alterações');
      }
    } catch (err) {
      setError('Erro de rede');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const res = await fetch(`/api/portal/${token}/approve-design`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (data.success) {
        onApprove();
      } else {
        setError(data.error || 'Erro ao aprovar design');
      }
    } catch (err) {
      setError('Erro de rede');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1E37]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-[#0E1E37] mb-1">Design Review</h2>
        <p className="text-sm text-gray-600">
          {!hasSubmittedReference 
            ? 'Envia uma referência do que gostarias de gravar na tua peça'
            : messages.some(m => m.senderType === 'ADMIN') 
              ? 'Vê as provas do design e aprova ou solicita alterações'
              : 'Referência enviada! Aguarda as provas do design...'
          }
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !hasSubmittedReference ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">Ainda sem mensagens</p>
            <p className="text-xs text-gray-400 mt-1">Envia a tua referência abaixo</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'INFLUENCER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.senderType === 'INFLUENCER'
                    ? 'bg-[#0E1E37] text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Design"
                    className="rounded-lg mb-2 max-w-full max-h-48 object-contain"
                  />
                )}
                {msg.content && <p className="text-sm">{msg.content}</p>}
                <p className="text-xs opacity-60 mt-1">
                  {new Date(msg.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{uploadError}</p>
        </div>
      )}

      {/* Input Area */}
      {!hasSubmittedReference ? (
        // First time - send reference
        <div className="border-t border-gray-200 pt-4">
          {uploadedImage && (
            <div className="relative mb-3 inline-block">
              <img src={uploadedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border" />
              <button onClick={clearImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <label htmlFor="ref-upload" className="cursor-pointer">
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                id="ref-upload"
              />
              <div className="p-3 text-gray-500 hover:bg-gray-100 rounded-full border">
                <Upload className="h-5 w-5" />
              </div>
            </label>
            
            <button
              onClick={handleSubmitReference}
              disabled={isSubmitting || !uploadedImage}
              className="flex-1 py-3 bg-[#0E1E37] text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'A enviar...' : 'Enviar Referência'}
            </button>
          </div>
        </div>
      ) : messages.some(m => m.senderType === 'ADMIN') ? (
        // Admin sent mockups - show approve/revision options
        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Revision request */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Queres alterar algo?</p>
            
            {uploadedImage && (
              <div className="relative mb-3 inline-block">
                <img src={uploadedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Descreve o que queres alterar..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none mb-2"
              rows={2}
            />
            
            <div className="flex gap-2">
              <label htmlFor="revision-upload" className="cursor-pointer">
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="revision-upload"
                />
                <div className="p-3 text-gray-500 hover:bg-gray-100 rounded-full border">
                  <ImageIcon className="h-5 w-5" />
                </div>
              </label>
              
              <button
                onClick={handleRequestRevision}
                disabled={isSubmitting || (!newMessage.trim() && !uploadedImage)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'A enviar...' : 'Pedir Alterações'}
              </button>
            </div>
          </div>

          {/* Approve button */}
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            {isSubmitting ? 'A processar...' : 'Aprovar Design'}
          </button>
        </div>
      ) : (
        // Waiting for admin
        <div className="border-t border-gray-200 pt-4 text-center">
          <p className="text-sm text-gray-500">
            Referência enviada! Aguarda as provas do design...
          </p>
        </div>
      )}
    </div>
  );
}
