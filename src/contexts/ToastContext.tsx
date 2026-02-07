'use client';

import React, { createContext, useContext, useState } from 'react';
import { ToastContainer } from '@/components/ui/Toast';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Date.now().toString();
    setToasts((prev) => [
      ...prev,
      { id, message, type, duration: duration || (type === 'error' ? 5000 : 4000) },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer 
        toasts={toasts.map(t => ({ ...t, onClose: removeToast }))} 
        onClose={removeToast} 
      />
    </ToastContext.Provider>
  );
}

export function useGlobalToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast must be used within ToastProvider');
  }
  return context;
}
