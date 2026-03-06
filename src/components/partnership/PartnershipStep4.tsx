'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';

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

export function PartnershipStep4({ workflow, isLocked }: PartnershipStep4Props) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

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

  const sendMessage = async () => {
    if (!newMessage.trim() && !imageUrl) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/design-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, imageUrl }),
      });

      if (res.ok) {
        setNewMessage('');
        setImageUrl('');
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
                  <img
                    src={msg.imageUrl}
                    alt="Design"
                    className="rounded-lg mb-2 max-w-full max-h-40 object-cover"
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

      {/* Send Message Form */}
      {!isLocked && !workflow.designApproved && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL da Imagem (mockup)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
            />
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
            disabled={isSending || (!newMessage.trim() && !imageUrl)}
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
