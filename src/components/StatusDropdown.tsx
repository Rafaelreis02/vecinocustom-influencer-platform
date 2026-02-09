'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getStatusConfig, WORKFLOW_STATUSES, type InfluencerStatus } from '@/lib/influencer-status';
import { StatusBadge } from './StatusBadge';

interface StatusDropdownProps {
  influencerId: string;
  currentStatus: string | null | undefined;
  onStatusChange?: (newStatus: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusDropdown({ influencerId, currentStatus, onStatusChange, size = 'md' }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  async function handleStatusChange(newStatus: InfluencerStatus) {
    if (updating || newStatus === currentStatus) return;
    
    setUpdating(true);
    setIsOpen(false);
    
    try {
      const res = await fetch(`/api/influencers/${influencerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar estado. Tenta novamente.');
    } finally {
      setUpdating(false);
    }
  }
  
  const buttonSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`flex items-center gap-2 transition hover:opacity-80 disabled:opacity-50 ${buttonSizeClasses[size]}`}
      >
        <StatusBadge status={currentStatus} size={size} showDot showIcon={false} />
        <ChevronDown className={`h-4 w-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Alterar Estado</p>
          </div>
          
          {WORKFLOW_STATUSES.map((status) => {
            const config = getStatusConfig(status);
            const isActive = status === currentStatus;
            
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                {config.label}
                {isActive && <span className="ml-auto text-blue-600">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
