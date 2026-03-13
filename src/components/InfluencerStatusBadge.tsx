'use client';

import { getStatusConfig } from '@/lib/influencer-status';

interface InfluencerStatusBadgeProps {
  status: string;
  className?: string;
}

export function InfluencerStatusBadge({ status, className = '' }: InfluencerStatusBadgeProps) {
  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
