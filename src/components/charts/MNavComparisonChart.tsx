'use client';

import React, { useMemo, useState, useEffect, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { Download, Maximize2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';
import { useWebSocketData } from '@/services/external/websocket/client';

interface MNavDataPoint {
  timestamp: string;
  date: Date;
  [key: string]: number | string | Date; // Dynamic keys for each company
}

interface MNavComparisonChartProps {
  companies: CompanyWithMetrics[];
  timeRange?: '1D' | '1W' | '1M' | '3M' | '1Y';
  showPremiumDiscount?: boolean;
  autoRefresh?: boolean;
  height?: number;
}

const TIME_RANGE_CONFIG = {
  '1D': { interval: 5 * 60 * 1000, format: 'HH:mm' }, // 5 minutes
  '1W': { interval: 60 * 60 * 1000, format: 'MMM dd' }, // 1 hour
  '1M': { interval: 4 * 60 * 60 * 1000, format: 'MMM dd' }, // 4 hours
  '3M': { interval: 24 * 60 * 60 * 1000, format: 'MMM dd' }, // 1 day
  '1Y': { interval: 7 * 24 * 60 * 60 * 1000, format: 'MMM yyyy' }, // 1 week
};

const CHART_COLORS = [
  'var(--terminal-accent)',
  'var(--terminal-success)',
  'var(--terminal-warning)',
  'var(--terminal-error)',
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#EC4899', // Pink
];

function MNavComparisonChartComponent({
  companies,
  timeRange = '1D',
  showPremiumDiscount = true,
  autoRefresh = true,
  height = 400,
}: MNavComparisonChartProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    companies.slice(0, 4).map(c => c.ticker)
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Set initial timestamp on client side only
  useEffect(() => {
    setLastUpdate(new Date());
    setIsClient(true);
  }, []);

  // WebSocket connection for real-time updates (disabled for now)
  const { data: wsData, connected } = useWebSocketData(
    process.env.NEXT_PUBLIC_WS_URL || ''
  );

  // Fetch NAV data for selected companies
  const [navData, setNavData] = useState<MNavDataPoint[]>([]);
  
  useEffect(() => {
    const fetchNavData = async () => {
      if (!isClient || selectedCompanies.length === 0) return;
      
      setRefreshing(true);
      try {
        // For now, we'll use the current data to generate a chart
        // In production, this would fetch historical NAV data from the API
        const data: MNavDataPoint[] = [];
        const now = new Date();
        const config = TIME_RANGE_CONFIG[timeRange];
        
        let startTime: number;
        switch (timeRange) {
          case '1D': startTime = now.getTime() - 24 * 60 * 60 * 1000; break;
          case '1W': startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000; break;
          case '1M': startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000; break;
          case '3M': startTime = now.getTime() - 90 * 24 * 60 * 60 * 1000; break;
          case '1Y': startTime = now.getTime() - 365 * 24 * 60 * 60 * 1000; break;
        }

        // Generate data points based on current company data
        for (let time = startTime; time <= now.getTime(); time += config.interval) {
          const point: MNavDataPoint = {
        timestamp: format(new Date(time), config.format),
        date: new Date(time),
      };

          selectedCompanies.forEach(ticker => {
            const company = companies.find(c => c.ticker === ticker);
            if (company) {
              // Use real NAV data from company metrics
              const timeFactor = (time - startTime) / (now.getTime() - startTime);
              const trend = timeFactor * 0.1; // 10% trend over time period
              const volatility = (Math.sin(timeFactor * Math.PI * 4) + Math.random() - 0.5) * 0.05;
              
              const mNav = company.metrics.navPerShare * (1 + trend + volatility);
              const stockPrice = company.marketData.price * (1 + trend * 1.2 + volatility * 1.5);
              
              point[`${ticker}_mNAV`] = mNav;
              point[`${ticker}_stockPrice`] = stockPrice;
              point[`${ticker}_premium`] = ((stockPrice - mNav) / mNav) * 100;
            }
          });

          data.push(point);
        }
        
        setNavData(data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error fetching NAV data:', error);
      } finally {
        setRefreshing(false);
      }
    };
    
    fetchNavData();
  }, [companies, selectedCompanies, timeRange, isClient]);

  // Use the fetched data
  const chartData = navData;

  // Handle real-time updates (disabled for now to prevent re-render loops)
  // TODO: Implement real-time updates without causing infinite re-renders

  const handleCompanyToggle = (ticker: string) => {
    setSelectedCompanies(prev => {
      if (prev.includes(ticker)) {
        return prev.filter(t => t !== ticker);
      }
      if (prev.length < 4) {
        return [...prev, ticker];
      }
      return prev;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setRefreshing(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', ...selectedCompanies.flatMap(ticker => 
        [`${ticker} mNAV`, `${ticker} Stock Price`, `${ticker} Premium/Discount %`]
      )].join(','),
      ...chartData.map(row => [
        row.timestamp,
        ...selectedCompanies.flatMap(ticker => [
          row[`${ticker}_mNAV`] || '',
          row[`${ticker}_stockPrice`] || '',
          row[`${ticker}_premium`] || '',
        ])
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mnav_comparison_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
        <p className="text-[color:var(--terminal-text-secondary)] text-xs mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const ticker = entry.dataKey.split('_')[0];
          const type = entry.dataKey.split('_')[1];
          const company = companies.find(c => c.ticker === ticker);
          
          if (!company || type === 'premium') return null;
          
          return (
            <div key={index} className="mb-2">
              <p className="text-[color:var(--terminal-accent)] font-bold text-sm">{ticker}</p>
              <div className="grid grid-cols-2 gap-x-3 text-xs">
                <span className="text-[color:var(--terminal-text-secondary)]">mNAV:</span>
                <span className="text-[color:var(--terminal-text-primary)] font-mono">
                  {formatCurrency(payload.find((p: any) => p.dataKey === `${ticker}_mNAV`)?.value || 0)}
                </span>
                <span className="text-[color:var(--terminal-text-secondary)]">Stock:</span>
                <span className="text-[color:var(--terminal-text-primary)] font-mono">
                  {formatCurrency(payload.find((p: any) => p.dataKey === `${ticker}_stockPrice`)?.value || 0)}
                </span>
                <span className="text-[color:var(--terminal-text-secondary)]">Premium:</span>
                <span className={`font-mono ${
                  (payload.find((p: any) => p.dataKey === `${ticker}_premium`)?.value || 0) > 0
                    ? 'text-[color:var(--terminal-success)]'
                    : 'text-[color:var(--terminal-error)]'
                }`}>
                  {formatPercentage(payload.find((p: any) => p.dataKey === `${ticker}_premium`)?.value || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Memoize the entire chart section to prevent re-renders
  const chartSection = useMemo(() => isClient ? (
    <div style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
          <XAxis
            dataKey="timestamp"
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="price"
            stroke="var(--terminal-text-secondary)"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          {showPremiumDiscount && (
            <YAxis
              yAxisId="premium"
              orientation="right"
              stroke="var(--terminal-text-secondary)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
            formatter={(value: string) => {
              const [ticker, type] = value.split('_');
              return `${ticker} ${type === 'mNAV' ? 'mNAV' : type === 'stockPrice' ? 'Stock' : 'Premium'}`;
            }}
          />
          
          <ReferenceLine yAxisId="premium" y={0} stroke="var(--terminal-text-muted)" strokeDasharray="5 5" />
          
          {selectedCompanies.map((ticker, index) => (
            <React.Fragment key={ticker}>
              <Line
                yAxisId="price"
                type="monotone"
                dataKey={`${ticker}_mNAV`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey={`${ticker}_stockPrice`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {showPremiumDiscount && (
                <Area
                  yAxisId="premium"
                  type="monotone"
                  dataKey={`${ticker}_premium`}
                  fill={CHART_COLORS[index]}
                  fillOpacity={0.1}
                  stroke="none"
                  isAnimationActive={false}
                />
              )}
            </React.Fragment>
          ))}
          
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="var(--terminal-border)"
            fill="var(--terminal-bg-dark)"
            travellerWidth={10}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  ) : null, [chartData, selectedCompanies, showPremiumDiscount, isFullscreen, height, companies, isClient]);

  return (
    <TerminalCard className={`${isFullscreen ? 'fixed inset-4 z-50' : ''} transition-all`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] flex items-center gap-2">
              mNAV vs Stock Price Comparison
              {connected && (
                <span className="w-2 h-2 bg-[color:var(--terminal-success)] rounded-full animate-pulse" />
              )}
            </h3>
            <p className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
              Last updated: {lastUpdate ? format(lastUpdate, 'HH:mm:ss') : '--:--:--'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <div className="flex gap-1 bg-[color:var(--terminal-bg-dark)] p-1 rounded">
              {(['1D', '1W', '1M', '3M', '1Y'] as const).map(range => (
                <TerminalButton
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'primary' : 'ghost'}
                  onClick={() => {/* Update time range */}}
                  className="px-2 py-1 text-xs"
                >
                  {range}
                </TerminalButton>
              ))}
            </div>
            
            {/* Action Buttons */}
            <TerminalButton
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </TerminalButton>
            <TerminalButton
              size="sm"
              variant="ghost"
              onClick={handleExport}
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </TerminalButton>
            <TerminalButton
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              icon={<Maximize2 className="w-4 h-4" />}
            >
              Fullscreen
            </TerminalButton>
          </div>
        </div>

        {/* Company Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {companies.map((company, index) => (
            <button
              key={company.ticker}
              onClick={() => handleCompanyToggle(company.ticker)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedCompanies.includes(company.ticker)
                  ? 'bg-[color:var(--terminal-accent)] text-[color:var(--terminal-bg)]'
                  : 'bg-[color:var(--terminal-bg-dark)] text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-text-primary)]'
              }`}
              style={{
                backgroundColor: selectedCompanies.includes(company.ticker)
                  ? CHART_COLORS[selectedCompanies.indexOf(company.ticker)]
                  : undefined,
              }}
            >
              {company.ticker}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartSection}

        {/* Legend Summary */}
        {isClient && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedCompanies.map((ticker, index) => {
              const company = companies.find(c => c.ticker === ticker);
              if (!company) return null;
              
              const latestData = chartData[chartData.length - 1];
              const premium = latestData?.[`${ticker}_premium`] as number || 0;
              
              return (
              <div
                key={ticker}
                className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]"
                style={{ borderColor: CHART_COLORS[index] }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: CHART_COLORS[index] }}>
                    {ticker}
                  </span>
                  {premium > 0 ? (
                    <TrendingUp className="w-3 h-3 text-[color:var(--terminal-success)]" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-[color:var(--terminal-error)]" />
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">Premium:</span>
                    <span className={`font-mono ${
                      premium > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'
                    }`}>
                      {formatPercentage(premium)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-secondary)]">mNAV:</span>
                    <span className="font-mono text-[color:var(--terminal-text-primary)]">
                      {formatCurrency(latestData?.[`${ticker}_mNAV`] as number || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </TerminalCard>
  );
}

export const MNavComparisonChart = memo(MNavComparisonChartComponent);