'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Globe, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Server,
  Cpu,
  HardDrive
} from 'lucide-react';
import { TerminalCard } from '@/components/ui';
import { OptimizedChart, MultiSeriesChart } from '@/components/charts/OptimizedChart';
import { formatPercentage, formatBytes } from '@/utils/formatters';
import { useThrottle } from '@/lib/performance/frontend-optimization';

interface PerformanceDashboardProps {
  refreshInterval?: number;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
  }>;
  system: {
    cpu: string;
    memory: string;
    uptime: string;
  };
}

interface PerformanceMetrics {
  database: {
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
    maxTime: number;
    slowQueryRatio: number;
  };
  api: {
    totalCalls: number;
    avgDuration: number;
    errorRate: number;
    endpoints: Array<{
      endpoint: string;
      avgDuration: number;
      callCount: number;
      errorRate: number;
    }>;
  };
  cache: {
    api: { size: number; maxSize: number; utilization: number };
    query: { l1: any; l2: any };
    calculation: { size: number; maxSize: number; utilization: number };
  };
  errors: {
    total: number;
    last24Hours: number;
    bySeverity: Record<string, number>;
  };
}

export function PerformanceDashboard({ refreshInterval = 30000 }: PerformanceDashboardProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch health status
  const fetchHealth = useThrottle(async () => {
    try {
      const response = await fetch('/api/monitoring/health');
      const data = await response.json();
      if (data.success) {
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch health status:', err);
    }
  }, 5000);

  // Fetch performance metrics
  const fetchMetrics = useThrottle(async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        
        // Add to historical data
        setHistoricalData(prev => {
          const newData = [...prev, {
            timestamp: Date.now(),
            dbAvgTime: data.data.database?.averageTime || 0,
            apiAvgTime: data.data.api?.avgDuration || 0,
            cacheHitRate: data.data.cache?.api?.utilization || 0,
            errorRate: data.data.api?.errorRate || 0
          }];
          
          // Keep only last 50 data points
          return newData.slice(-50);
        });
      }
    } catch (err) {
      setError('Failed to fetch metrics');
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, 5000);

  useEffect(() => {
    fetchHealth();
    fetchMetrics();

    const interval = setInterval(() => {
      fetchHealth();
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-[color:var(--terminal-success)]" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-[color:var(--terminal-warning)]" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-[color:var(--terminal-error)]" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'var(--terminal-success)';
      case 'degraded':
        return 'var(--terminal-warning)';
      case 'unhealthy':
        return 'var(--terminal-error)';
      default:
        return 'var(--terminal-text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <TerminalCard key={i}>
            <div className="p-4 animate-pulse">
              <div className="h-4 bg-[color:var(--terminal-bg-dark)] rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-[color:var(--terminal-bg-dark)] rounded w-1/2"></div>
            </div>
          </TerminalCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Health */}
        <TerminalCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[color:var(--terminal-text-secondary)]">
                System Health
              </h3>
              {health && getStatusIcon(health.overall)}
            </div>
            <p className="text-2xl font-bold" style={{ color: health ? getStatusColor(health.overall) : undefined }}>
              {health?.overall.toUpperCase() || 'UNKNOWN'}
            </p>
            {health?.system && (
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[color:var(--terminal-text-secondary)]">CPU:</span>
                  <span className="font-mono">{health.system.cpu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--terminal-text-secondary)]">Memory:</span>
                  <span className="font-mono">{health.system.memory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--terminal-text-secondary)]">Uptime:</span>
                  <span className="font-mono">{health.system.uptime}</span>
                </div>
              </div>
            )}
          </div>
        </TerminalCard>

        {/* Database Performance */}
        <TerminalCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[color:var(--terminal-text-secondary)]">
                Database Performance
              </h3>
              <Database className="w-4 h-4 text-[color:var(--terminal-accent)]" />
            </div>
            {metrics?.database && (
              <>
                <p className="text-2xl font-bold text-[color:var(--terminal-accent)]">
                  {metrics.database.averageTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">
                  Average Query Time
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">Total Queries:</span>
                    <span className="font-mono">{metrics.database.totalQueries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">Slow Queries:</span>
                    <span className="font-mono text-[color:var(--terminal-warning)]">
                      {metrics.database.slowQueries}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TerminalCard>

        {/* API Performance */}
        <TerminalCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[color:var(--terminal-text-secondary)]">
                API Performance
              </h3>
              <Zap className="w-4 h-4 text-[color:var(--terminal-success)]" />
            </div>
            {metrics?.api && (
              <>
                <p className="text-2xl font-bold text-[color:var(--terminal-success)]">
                  {metrics.api.avgDuration.toFixed(0)}ms
                </p>
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">
                  Average Response Time
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">Total Calls:</span>
                    <span className="font-mono">{metrics.api.totalCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">Error Rate:</span>
                    <span className="font-mono text-[color:var(--terminal-error)]">
                      {formatPercentage(metrics.api.errorRate * 100)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TerminalCard>
      </div>

      {/* Service Status Grid */}
      {health?.services && (
        <TerminalCard>
          <div className="p-4">
            <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] mb-4">
              Service Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {health.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  {service.message && (
                    <span className="text-xs text-[color:var(--terminal-text-secondary)]">
                      {service.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Performance Trends */}
      {historicalData.length > 0 && (
        <TerminalCard>
          <div className="p-4">
            <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] mb-4">
              Performance Trends
            </h3>
            <MultiSeriesChart
              data={historicalData}
              series={[
                { dataKey: 'dbAvgTime', name: 'DB Response', color: 'var(--terminal-accent)' },
                { dataKey: 'apiAvgTime', name: 'API Response', color: 'var(--terminal-success)' },
              ]}
              height={250}
              formatValue={(v) => `${v.toFixed(0)}ms`}
            />
          </div>
        </TerminalCard>
      )}

      {/* Cache Performance */}
      {metrics?.cache && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TerminalCard>
            <div className="p-4">
              <h4 className="text-sm font-medium text-[color:var(--terminal-text-secondary)] mb-2">
                API Cache
              </h4>
              <div className="relative h-2 bg-[color:var(--terminal-bg-dark)] rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--terminal-accent)]"
                  style={{ width: `${metrics.cache.api.utilization * 100}%` }}
                />
              </div>
              <p className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
                {metrics.cache.api.size} / {metrics.cache.api.maxSize} entries
              </p>
            </div>
          </TerminalCard>

          <TerminalCard>
            <div className="p-4">
              <h4 className="text-sm font-medium text-[color:var(--terminal-text-secondary)] mb-2">
                Query Cache (L1)
              </h4>
              <div className="relative h-2 bg-[color:var(--terminal-bg-dark)] rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--terminal-success)]"
                  style={{ width: `${metrics.cache.query.l1.utilization * 100}%` }}
                />
              </div>
              <p className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
                {metrics.cache.query.l1.size} / {metrics.cache.query.l1.maxSize} entries
              </p>
            </div>
          </TerminalCard>

          <TerminalCard>
            <div className="p-4">
              <h4 className="text-sm font-medium text-[color:var(--terminal-text-secondary)] mb-2">
                Calculation Cache
              </h4>
              <div className="relative h-2 bg-[color:var(--terminal-bg-dark)] rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--terminal-warning)]"
                  style={{ width: `${metrics.cache.calculation.utilization * 100}%` }}
                />
              </div>
              <p className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
                {metrics.cache.calculation.size} / {metrics.cache.calculation.maxSize} entries
              </p>
            </div>
          </TerminalCard>
        </div>
      )}

      {/* Top API Endpoints */}
      {metrics?.api?.endpoints && metrics.api.endpoints.length > 0 && (
        <TerminalCard>
          <div className="p-4">
            <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] mb-4">
              Top API Endpoints
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--terminal-border)]">
                    <th className="text-left py-2 text-[color:var(--terminal-text-secondary)]">Endpoint</th>
                    <th className="text-right py-2 text-[color:var(--terminal-text-secondary)]">Calls</th>
                    <th className="text-right py-2 text-[color:var(--terminal-text-secondary)]">Avg Time</th>
                    <th className="text-right py-2 text-[color:var(--terminal-text-secondary)]">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.api.endpoints.slice(0, 10).map((endpoint, index) => (
                    <tr key={index} className="border-b border-[color:var(--terminal-border)]">
                      <td className="py-2 font-mono text-xs">{endpoint.endpoint}</td>
                      <td className="text-right py-2">{endpoint.callCount}</td>
                      <td className="text-right py-2">{endpoint.avgDuration.toFixed(0)}ms</td>
                      <td className="text-right py-2">
                        <span className={endpoint.errorRate > 0.05 ? 'text-[color:var(--terminal-error)]' : ''}>
                          {formatPercentage(endpoint.errorRate * 100)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Error Summary */}
      {metrics?.errors && (
        <TerminalCard>
          <div className="p-4">
            <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] mb-4">
              Error Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">Total Errors</p>
                <p className="text-2xl font-bold text-[color:var(--terminal-error)]">
                  {metrics.errors.total}
                </p>
              </div>
              <div>
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">Last 24h</p>
                <p className="text-2xl font-bold text-[color:var(--terminal-warning)]">
                  {metrics.errors.last24Hours}
                </p>
              </div>
              {Object.entries(metrics.errors.bySeverity || {}).map(([severity, count]) => (
                <div key={severity}>
                  <p className="text-xs text-[color:var(--terminal-text-secondary)]">{severity}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </TerminalCard>
      )}
    </div>
  );
}