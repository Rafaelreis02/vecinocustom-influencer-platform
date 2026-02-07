import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hoverable, padding = 'md' }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-gray-200',
        {
          'hover:border-gray-900 transition-colors cursor-pointer': hoverable,
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card hoverable>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-md bg-gray-100">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-semibold text-gray-900 mb-2">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm">
          <span className={clsx(
            'inline-flex items-center gap-1 font-medium',
            trend.isPositive ? 'text-gray-900' : 'text-gray-600'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {trend.value}
          </span>
          <span className="text-gray-500 ml-2">vs último mês</span>
        </div>
      )}
    </Card>
  );
}

export default Card;
