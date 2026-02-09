import { getStatusConfig, type InfluencerStatus } from '@/lib/influencer-status';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showIcon = false, showDot = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const dotSizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`rounded-full ${config.dotColor} ${dotSizeClasses[size]}`} />
      )}
      {showIcon && <span className="text-xs">{config.icon}</span>}
      {config.label}
    </span>
  );
}
