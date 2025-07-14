import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/formatters';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'currency' | 'percentage' | 'number';
  icon?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  pulse?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'number',
  icon,
  className,
  size = 'md',
  isLoading = false,
  pulse = false,
}: MetricCardProps) {
  const formatChange = (val: number) => {
    switch (changeType) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      default:
        return val > 0 ? `+${val}` : val.toString();
    }
  };

  const getTrendIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="w-3 h-3" />;
    if (val < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  if (isLoading) {
    return (
      <div className={cn(
        'bg-black border border-green-500/50 rounded-lg',
        sizeClasses[size],
        className
      )}>
        <div className="space-y-2">
          <div className="h-4 bg-green-500/20 rounded animate-pulse" />
          <div className="h-6 bg-green-500/20 rounded animate-pulse" />
          <div className="h-3 bg-green-500/20 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-black border border-green-500/50 rounded-lg transition-all duration-200 hover:border-green-400/70',
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {icon && <div className="text-green-400 flex-shrink-0">{icon}</div>}
            <p className="text-green-500/70 text-xs uppercase tracking-wider font-medium truncate">
              {title}
            </p>
          </div>
          
          <p className={cn(
            'font-mono font-bold text-green-100 leading-none',
            textSizes[size]
          )}>
            {value}
          </p>
          
          {change !== undefined && (
            <div className={cn(
              'flex items-center space-x-1 mt-2 text-xs',
              getChangeColor(change)
            )}>
              {getTrendIcon(change)}
              <span className="font-mono">{formatChange(change)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}