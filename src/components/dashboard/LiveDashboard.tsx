'use client';

import { useState, useEffect } from 'react';
import { useRealTimeData, useWebSocket, useDataFreshness } from '@/hooks';
import { MNavComparisonChart } from '@/components/charts/MNavComparisonChart';
import { TerminalCard, MetricCard, DataStatusIndicator } from '@/components/ui';
import { 
  TrendingUp, 
  Building2, 
  DollarSign, 
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

interface LiveDashboardProps {
  companies: any[];
  initialMarketData: any;
}

export function LiveDashboard({ companies, initialMarketData }: LiveDashboardProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['MSTR', 'DFDV', 'UPXI', 'SBET']);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time data hooks
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const { data: realTimeData, loading } = useRealTimeData(['companies', 'market', 'analytics']);
  const { dataAge, isStale, lastUpdate } = useDataFreshness();

  // Subscribe to real-time updates
  useEffect(() => {
    const channels = [
      'market:crypto',
      'market:stocks',
      'companies:all',
      'analytics:nav'
    ];

    channels.forEach(channel => subscribe(channel));

    return () => {
      channels.forEach(channel => unsubscribe(channel));
    };
  }, [subscribe, unsubscribe]);

  // Calculate summary metrics from real-time data
  const summaryMetrics = {
    totalTreasuryValue: companies.reduce((total, company) => {
      return total + (company.treasury?.reduce((sum: number, holding: any) => 
        sum + (holding.currentValue || 0), 0) || 0);
    }, 0),
    totalMarketCap: companies.reduce((total, company) => total + (company.marketCap || 0), 0),
    avgPremiumToNav: companies.reduce((total, company) => {
      const nav = realTimeData?.analytics?.[company.ticker]?.nav || 0;
      const stockPrice = realTimeData?.market?.stocks?.[company.ticker]?.price || 0;
      const premium = nav > 0 ? ((stockPrice - nav) / nav) * 100 : 0;
      return total + premium;
    }, 0) / companies.length,
    activeCompanies: companies.filter(c => c.treasury?.length > 0).length
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/data/refresh', { method: 'POST' });
      // Data will update via WebSocket
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
            Live Treasury Analytics
          </h2>
          <p className="text-[color:var(--terminal-text-secondary)] text-sm mt-1">
            Real-time digital asset treasury monitoring and analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <DataStatusIndicator 
            isConnected={isConnected}
            lastUpdate={lastUpdate}
            isStale={isStale}
            dataAge={dataAge}
          />
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded border border-[color:var(--terminal-border)]
              ${refreshing 
                ? 'bg-[color:var(--terminal-surface)] text-[color:var(--terminal-text-muted)]' 
                : 'hover:bg-[color:var(--terminal-accent)]/10 text-[color:var(--terminal-accent)]'
              }
              transition-colors font-mono text-sm
            `}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Live Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Treasury Value"
          value={formatCurrency(summaryMetrics.totalTreasuryValue, 0)}
          change={realTimeData?.analytics?.treasuryChange24h}
          changeType="currency"
          icon={<DollarSign className="w-4 h-4" />}
          isLive={!isStale}
        />
        
        <MetricCard
          title="Total Market Cap"
          value={formatCurrency(summaryMetrics.totalMarketCap, 0)}
          change={realTimeData?.analytics?.marketCapChange24h}
          changeType="currency"
          icon={<Building2 className="w-4 h-4" />}
          isLive={!isStale}
        />
        
        <MetricCard
          title="Avg Premium to NAV"
          value={formatPercentage(summaryMetrics.avgPremiumToNav)}
          change={realTimeData?.analytics?.premiumChange24h}
          changeType="percentage"
          icon={<TrendingUp className="w-4 h-4" />}
          isLive={!isStale}
        />
        
        <MetricCard
          title="Active Companies"
          value={summaryMetrics.activeCompanies.toString()}
          icon={<Activity className="w-4 h-4" />}
          isLive={!isStale}
        />
      </div>

      {/* Main mNAV Comparison Chart */}
      <TerminalCard 
        title="mNAV vs Stock Price Comparison" 
        className="col-span-full"
        action={
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-1 text-[color:var(--terminal-success)] text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>Live</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-[color:var(--terminal-warning)] text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>Disconnected</span>
              </div>
            )}
          </div>
        }
      >
        <MNavComparisonChart
          companies={selectedCompanies}
          realTimeData={realTimeData}
          height={400}
          showControls={true}
          onCompanySelectionChange={setSelectedCompanies}
        />
      </TerminalCard>

      {/* Live Market Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Crypto Market Status */}
        <TerminalCard title="Crypto Market Status">
          <div className="space-y-4">
            {['BTC', 'ETH', 'SOL'].map(crypto => {
              const price = realTimeData?.market?.crypto?.[crypto];
              const change24h = price?.change24hPercent || 0;
              
              return (
                <div key={crypto} className="flex items-center justify-between p-3 rounded border border-[color:var(--terminal-border)]">
                  <div className="flex items-center space-x-3">
                    <span className="text-[color:var(--terminal-accent)] font-mono font-bold">
                      {crypto}
                    </span>
                    <span className="text-[color:var(--terminal-text-primary)] font-mono">
                      {formatCurrency(price?.price || 0)}
                    </span>
                  </div>
                  <div className={`
                    font-mono text-sm
                    ${change24h >= 0 
                      ? 'text-[color:var(--terminal-success)]' 
                      : 'text-[color:var(--terminal-danger)]'
                    }
                  `}>
                    {change24h >= 0 ? '+' : ''}{formatPercentage(change24h)}
                  </div>
                </div>
              );
            })}
          </div>
        </TerminalCard>

        {/* Stock Market Status */}
        <TerminalCard title="DAT Company Stocks">
          <div className="space-y-4">
            {companies.slice(0, 4).map(company => {
              const stockData = realTimeData?.market?.stocks?.[company.ticker];
              const navData = realTimeData?.analytics?.[company.ticker]?.nav;
              const premium = navData && stockData ? 
                ((stockData.price - navData) / navData) * 100 : 0;
              
              return (
                <div key={company.ticker} className="flex items-center justify-between p-3 rounded border border-[color:var(--terminal-border)]">
                  <div className="flex items-center space-x-3">
                    <span className="text-[color:var(--terminal-accent)] font-mono font-bold">
                      {company.ticker}
                    </span>
                    <span className="text-[color:var(--terminal-text-primary)] font-mono">
                      {formatCurrency(stockData?.price || 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`
                      font-mono text-sm
                      ${premium >= 0 
                        ? 'text-[color:var(--terminal-success)]' 
                        : 'text-[color:var(--terminal-danger)]'
                      }
                    `}>
                      {premium >= 0 ? '+' : ''}{formatPercentage(premium)} NAV
                    </div>
                    <div className="text-[color:var(--terminal-text-muted)] text-xs">
                      vs mNAV: {formatCurrency(navData || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TerminalCard>
      </div>

      {/* Data Source Health */}
      <TerminalCard title="Data Source Health">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'CoinGecko API', status: 'active', latency: '120ms' },
            { name: 'Alpha Vantage', status: 'active', latency: '250ms' },
            { name: 'SEC EDGAR', status: 'active', latency: '500ms' }
          ].map(source => (
            <div key={source.name} className="flex items-center justify-between p-3 rounded border border-[color:var(--terminal-border)]">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-2 h-2 rounded-full
                  ${source.status === 'active' 
                    ? 'bg-[color:var(--terminal-success)]' 
                    : 'bg-[color:var(--terminal-danger)]'
                  }
                `} />
                <span className="text-[color:var(--terminal-text-primary)] font-mono text-sm">
                  {source.name}
                </span>
              </div>
              <span className="text-[color:var(--terminal-text-secondary)] font-mono text-xs">
                {source.latency}
              </span>
            </div>
          ))}
        </div>
      </TerminalCard>
    </div>
  );
}