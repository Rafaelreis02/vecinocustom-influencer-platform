'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, RefreshCw, Send, Image as ImageIcon, X } from 'lucide-react';

interface DesignMessage {
  id: string;
  content: string;
  imageUrl?: string;
  senderType: 'ADMIN' | 'INFLUENCER';
  createdAt: string;
}

interface Step4DesignReviewProps {
  token: string;
  onApprove: () => void;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function Step4DesignReview({ token, onApprove }: Step4DesignReviewProps) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch messages
  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle file upload - Mobile optimized
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    // Reset input key to allow re-selecting same file
    setFileInputKey(Date.now());
    
    if (!file) {
      console.log('[UPLOAD] No file selected');
      return;
    }

    console.log('[UPLOAD] File selected:', { name: file.name, type: file.type, size: file.size });

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('A imagem deve ter menos de 5MB');
      return;
    }

    // More permissive image check for mobile devices
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isImage) {
      setUploadError('O ficheiro deve ser uma imagem (JPG, PNG, GIF, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      console.log('[UPLOAD] File converted to base64, length:', base64.length);
      setUploadedImage(base64);
    };
    reader.onerror = () => {
      console.error('[UPLOAD] FileReader error');
      setUploadError('Erro ao ler o ficheiro. Tenta novamente.');
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setUploadedImage(null);
    setUploadError(null);
  };

  const fetchMessages = async () => {
    try {
      console.log('[PORTAL] Fetching messages for token:', token);
      const res = await fetch(`/api/portal/${token}/design-messages`);
      const data = await res.json();
      console.log('[PORTAL] Response:', data);
      
      if (data.success) {
        console.log('[PORTAL] Found messages:', data.data?.length || 0);
        setMessages(data.data || []);
      } else {
        console.error('[PORTAL] API error:', data.error);
        setError(data.error || 'Erro ao carregar mensagens');
      }
    } catch (err) {
      console.error('[PORTAL] Error fetching messages:', err);
      setError('Erro de rede ao carregar mensagens');
    } finally {
      setIsLoading(false);
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
        setError(data.error || 'Failed to approve design');
      }
    } catch (err) {
      setError('Failed to approve design');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionMessage.trim() && !uploadedImage) {
      setError('Escreve uma mensagem ou envia uma imagem');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Upload image if present
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
        } else {
          setError('Erro ao fazer upload da imagem');
          setIsSubmitting(false);
          return;
        }
      }
      
      const res = await fetch(`/api/portal/${token}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: revisionMessage, imageUrl: finalImageUrl }),
      });
      
      const data = await res.json();
      if (data.success) {
        setRevisionMessage('');
        setUploadedImage(null);
        await fetchMessages();
      } else {
        setError(data.error || 'Failed to request revision');
      }
    } catch (err) {
      setError('Failed to request revision');
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
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-2">Design Review</h2>
      <p className="text-sm text-gray-600 mb-6">
        Review the design for your personalized piece. Approve it or request changes.
      </p>

      {/* Chat Messages */}
      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Waiting for the design mockup...</p>
            <p className="text-sm mt-2">We'll send you a preview soon!</p>
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
                    className="rounded-lg mb-2 max-w-full"
                  />
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

      {/* Action Buttons */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {/* Revision Request */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Need changes? Describe what you want or send a reference image:
            </p>
            
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
            
            <textarea
              value={revisionMessage}
              onChange={(e) => setRevisionMessage(e.target.value)}
              placeholder="Ex: Please make the text bigger, or change the font..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-[#0E1E37] focus:outline-none resize-none"
              rows={3}
            />
            {/* Upload Button - Mobile Optimized */}
            <div className="flex items-center gap-2 mt-2">
              <label className="flex-shrink-0 cursor-pointer touch-manipulation">
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/jpg,image/heic,image/heif"
                  onChange={handleFileChange}
                  className="sr-only"
                  style={{ display: 'none' }}
                  id="portal-image-upload"
                />
                <div 
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200 border border-gray-200"
                  onClick={() => document.getElementById('portal-image-upload')?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </div>
              </label>
              
              <button
                onClick={handleRequestRevision}
                disabled={isSubmitting || (!revisionMessage.trim() && !uploadedImage)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Request Changes
                  </>
                )}
              </button>
            </div>
            
            {uploadError && (
              <p className="text-xs text-red-600 mt-2">{uploadError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Toca no ícone 📎 para enviar uma imagem • Máx. 5MB
            </p>
          </div>

          {/* Approve Button */}
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#0E1E37] text-white rounded-lg font-medium hover:bg-[#1a2f4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Approve Design & Continue
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
