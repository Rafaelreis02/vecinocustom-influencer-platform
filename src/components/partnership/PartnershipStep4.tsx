'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Send, Image as ImageIcon, CheckCircle, X } from 'lucide-react';

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
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function PartnershipStep4({ workflow, isLocked }: PartnershipStep4Props) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('A imagem deve ter menos de 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('O ficheiro deve ser uma imagem');
      return;
    }

    // Convert to base64 for preview and upload
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      setImageUrl(base64); // Use base64 as imageUrl
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
      
      // If we have a base64 image, upload it first
      let finalImageUrl = imageUrl;
      if (uploadedImage && uploadedImage.startsWith('data:')) {
        // Upload to server
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

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Step 4: Design Review
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Envie o mockup/design para o influencer aprovar. Aguarde a aprovação dele antes de avançar.
      </p>

      {/* Status */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-800">
            <span className="font-medium">Status:</span>{' '}
            {workflow.designApproved
              ? '✅ Design Aprovado'
              : `⏳ Aguardando aprovação (Revisões: ${workflow.designRevisionCount})`}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="border border-gray-200 rounded-lg p-4 mb-4 h-[300px] overflow-y-auto space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Envie o mockup do design para o influencer.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.senderType === 'ADMIN'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.imageUrl && (
                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.imageUrl}
                      alt="Design"
                      className="rounded-lg mb-2 max-w-full max-h-40 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                    />
                  </a>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Message Form */}
      {!isLocked && !workflow.designApproved && (
        <div className="space-y-3">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagem do Design
            </label>
            
            {uploadedImage ? (
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="w-full h-40 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-colors">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Carregar imagem</span>
                    </div>
                  </label>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-400">ou</span>
                  </div>
                </div>
                
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Cole o link da imagem (URL)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            )}
            
            {uploadError && (
              <p className="text-sm text-red-600 mt-1">{uploadError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Máximo 5MB. Formatos: JPG, PNG, GIF
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Descreva o design..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black resize-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isSending || (!newMessage.trim() && !imageUrl) || !!uploadError}
            className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Design
              </>
            )}
          </button>
        </div>
      )}

      {workflow.designApproved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <CheckCircle className="h-4 w-4 inline mr-1" />
            <span className="font-medium">Design aprovado!</span> O influencer já aprovou o design. Podes avançar para o contrato.
          </p>
        </div>
      )}
    </div>
  );
}
