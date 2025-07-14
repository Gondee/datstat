import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, RefreshCw, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWebSocketStatus } from '@/hooks/useWebSocket';
import { formatDataAge } from '@/hooks/useDataFreshness';

interface DataSourceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdate: string;
  errorRate: number;
  latency: number;
}

interface DataStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function DataStatusIndicator({ 
  className, 
  showDetails = false, 
  compact = false 
}: DataStatusIndicatorProps) {
  const { isConnected, isConnecting, error } = useWebSocketStatus();
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Fetch data source health periodically
    const fetchDataSourceHealth = async () => {
      try {
        const response = await fetch('/api/data/refresh');
        if (response.ok) {
          const data = await response.json();
          // Transform the response to match our interface
          if (data.dataSources) {
            const transformed = data.dataSources.map((source: any) => ({
              name: source.name,
              status: source.status === 'ACTIVE' ? 'healthy' : 
                     source.status === 'ERROR' ? 'down' : 'degraded',
              lastUpdate: source.lastSync || 'Never',
              errorRate: source.errorCount || 0,
              latency: 0, // Would need to be tracked separately
            }));
            setDataSources(transformed);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data source health:', error);
      }
    };

    fetchDataSourceHealth();
    const interval = setInterval(fetchDataSourceHealth, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getConnectionStatus = () => {
    if (isConnecting) return { icon: RefreshCw, color: 'text-blue-500', text: 'Connecting', spinning: true };
    if (error) return { icon: WifiOff, color: 'text-red-500', text: 'Disconnected', spinning: false };
    if (isConnected) return { icon: Wifi, color: 'text-green-500', text: 'Connected', spinning: false };
    return { icon: WifiOff, color: 'text-gray-500', text: 'Offline', spinning: false };
  };

  const getOverallDataHealth = () => {
    if (dataSources.length === 0) return 'unknown';
    
    const healthyCount = dataSources.filter(s => s.status === 'healthy').length;
    const degradedCount = dataSources.filter(s => s.status === 'degraded').length;
    const downCount = dataSources.filter(s => s.status === 'down').length;

    if (downCount > 0) return 'down';
    if (degradedCount > 0) return 'degraded';
    if (healthyCount === dataSources.length) return 'healthy';
    return 'unknown';
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Activity className="w-3 h-3 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'down': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const connectionStatus = getConnectionStatus();
  const overallHealth = getOverallDataHealth();

  if (compact) {
    return (
      <div className={cn(
        'flex items-center space-x-2',
        className
      )}>
        <div className="flex items-center space-x-1">
          <connectionStatus.icon 
            className={cn(
              'w-3 h-3',
              connectionStatus.color,
              connectionStatus.spinning && 'animate-spin'
            )} 
          />
          {isConnected && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {dataSources.length > 0 && (
          <div className="flex items-center space-x-1">
            {getHealthIcon(overallHealth)}
            <span className="text-xs font-mono text-gray-600">
              {dataSources.filter(s => s.status === 'healthy').length}/{dataSources.length}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-3',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <connectionStatus.icon 
            className={cn(
              'w-4 h-4',
              connectionStatus.color,
              connectionStatus.spinning && 'animate-spin'
            )} 
          />
          <span className="text-sm font-medium text-[color:var(--terminal-text-primary)]">
            Real-time Data
          </span>
          {isConnected && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-mono">LIVE</span>
            </div>
          )}
        </div>
        
        {dataSources.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-primary)] transition-colors"
          >
            {isExpanded ? 'Hide' : 'Show'} Details
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[color:var(--terminal-text-secondary)]">Connection:</span>
          <span className={cn('font-mono', connectionStatus.color)}>
            {connectionStatus.text}
          </span>
        </div>

        {error && (
          <div className="text-xs text-red-500 font-mono">
            {error}
          </div>
        )}
      </div>

      {/* Data Sources Health */}
      {dataSources.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[color:var(--terminal-text-secondary)]">Data Sources:</span>
            <div className="flex items-center space-x-1">
              {getHealthIcon(overallHealth)}
              <span className="font-mono text-xs">
                {dataSources.filter(s => s.status === 'healthy').length}/{dataSources.length} healthy
              </span>
            </div>
          </div>

          {(isExpanded || showDetails) && (
            <div className="space-y-1">
              {dataSources.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {getHealthIcon(source.status)}
                    <span className="text-[color:var(--terminal-text-secondary)]">
                      {source.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    {source.lastUpdate !== 'Never' && (
                      <span className="text-[color:var(--terminal-text-secondary)]">
                        {formatDataAge(Math.floor((Date.now() - new Date(source.lastUpdate).getTime()) / 1000))}
                      </span>
                    )}
                    {source.errorRate > 0 && (
                      <span className="text-red-500">
                        {source.errorRate} errors
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real-time Activity Indicator */}
      {isConnected && (
        <div className="mt-3 pt-2 border-t border-[color:var(--terminal-border)]">
          <div className="flex items-center space-x-2 text-xs text-[color:var(--terminal-text-secondary)]">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span>Real-time updates active</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple connection status badge for headers/toolbars
export function ConnectionStatusBadge({ className }: { className?: string }) {
  const { isConnected, isConnecting } = useWebSocketStatus();

  const getStatus = () => {
    if (isConnecting) return { color: 'bg-blue-500', text: 'Connecting' };
    if (isConnected) return { color: 'bg-green-500', text: 'Live' };
    return { color: 'bg-red-500', text: 'Offline' };
  };

  const status = getStatus();

  return (
    <div className={cn(
      'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-mono text-white',
      status.color,
      className
    )}>
      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      <span>{status.text}</span>
    </div>
  );
}