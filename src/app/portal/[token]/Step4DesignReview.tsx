'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, RefreshCw, Send, Image as ImageIcon } from 'lucide-react';

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

export function Step4DesignReview({ token, onApprove }: Step4DesignReviewProps) {
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages
  useEffect(() => {
    fetchMessages();
  }, [token]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/portal/${token}/design-messages`);
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
    if (!revisionMessage.trim()) {
      setError('Please describe what you want to change');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const res = await fetch(`/api/portal/${token}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: revisionMessage }),
      });
      
      const data = await res.json();
      if (data.success) {
        setRevisionMessage('');
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

      {/* Action Buttons */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {/* Revision Request */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Need changes? Describe what you want:
            </p>
            <textarea
              value={revisionMessage}
              onChange={(e) => setRevisionMessage(e.target.value)}
              placeholder="Ex: Please make the text bigger, or change the font..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-[#0E1E37] focus:outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleRequestRevision}
              disabled={isSubmitting}
              className="mt-2 w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
