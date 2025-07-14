import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/formatters';
import { formatDataAge, getFreshnessColor, getFreshnessIcon } from '@/hooks/useDataFreshness';

interface DataFreshnessInfo {
  status: 'fresh' | 'stale' | 'expired' | 'unknown';
  lastUpdated?: Date;
  ageInSeconds?: number;
  isRefreshing?: boolean;
  isConnected?: boolean;
  onRefresh?: () => void;
}

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
  freshness?: DataFreshnessInfo;
  showLiveIndicator?: boolean;
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
  freshness,
  showLiveIndicator = false,
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

  const getFreshnessIndicator = () => {
    if (!freshness) return null;

    const getStatusIcon = () => {
      if (freshness.isRefreshing) {
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      }
      
      if (!freshness.isConnected) {
        return <WifiOff className="w-3 h-3" />;
      }

      switch (freshness.status) {
        case 'fresh':
          return <Wifi className="w-3 h-3" />;
        case 'stale':
          return <Clock className="w-3 h-3" />;
        case 'expired':
          return <AlertTriangle className="w-3 h-3" />;
        case 'unknown':
        default:
          return <Clock className="w-3 h-3 opacity-50" />;
      }
    };

    const getStatusColor = () => {
      if (freshness.isRefreshing) return 'text-blue-500';
      if (!freshness.isConnected) return 'text-gray-500';
      
      switch (freshness.status) {
        case 'fresh':
          return 'text-green-500';
        case 'stale':
          return 'text-yellow-500';
        case 'expired':
          return 'text-red-500';
        case 'unknown':
        default:
          return 'text-gray-500';
      }
    };

    const getTooltipText = () => {
      if (freshness.isRefreshing) return 'Refreshing data...';
      if (!freshness.isConnected) return 'Disconnected';
      
      if (freshness.lastUpdated && freshness.ageInSeconds !== undefined) {
        return `Last updated: ${formatDataAge(freshness.ageInSeconds)}`;
      }
      
      return 'Data status unknown';
    };

    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={freshness.onRefresh}
          disabled={freshness.isRefreshing}
          className={cn(
            'transition-colors hover:opacity-80 disabled:cursor-not-allowed',
            getStatusColor()
          )}
          title={getTooltipText()}
        >
          {getStatusIcon()}
        </button>
        
        {freshness.lastUpdated && freshness.ageInSeconds !== undefined && (
          <span 
            className={cn(
              'text-xs font-mono',
              getStatusColor()
            )}
            title={`Last updated: ${freshness.lastUpdated.toLocaleString()}`}
          >
            {formatDataAge(freshness.ageInSeconds)}
          </span>
        )}
      </div>
    );
  };

  const getLiveIndicator = () => {
    if (!showLiveIndicator || !freshness?.isConnected) return null;
    
    return (
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-green-500 font-mono">LIVE</span>
      </div>
    );
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
        'bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg',
        sizeClasses[size],
        className
      )}>
        <div className="space-y-2">
          <div className="h-4 bg-[color:var(--terminal-primary)]/20 rounded animate-pulse" />
          <div className="h-6 bg-[color:var(--terminal-primary)]/20 rounded animate-pulse" />
          <div className="h-3 bg-[color:var(--terminal-primary)]/20 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg transition-all duration-200 hover:border-[color:var(--terminal-primary)]/70',
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      <div className="space-y-2">
        {/* Header with title, freshness, and live indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {icon && <div className="text-[color:var(--terminal-accent)] flex-shrink-0">{icon}</div>}
            <p className="text-[color:var(--terminal-text-secondary)] text-xs uppercase tracking-wider font-medium truncate">
              {title}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {getLiveIndicator()}
            {getFreshnessIndicator()}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-mono font-bold text-[color:var(--terminal-text-primary)] leading-none',
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