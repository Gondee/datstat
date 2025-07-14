'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceArea,
  Dot,
} from 'recharts';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { Calendar, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';

interface HistoricalAnalysisChartProps {
  company: CompanyWithMetrics;
  height?: number;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';
type ChartType = 'premium' | 'nav' | 'dilution' | 'transactions';

interface HistoricalDataPoint {
  date: string;
  timestamp: Date;
  navPerShare: number;
  stockPrice: number;
  premiumDiscount: number;
  treasuryValue: number;
  shareCount: number;
  dilutionPercent: number;
  transaction?: {
    type: 'buy' | 'sell' | 'convert';
    amount: number;
    description: string;
  };
}

const TIME_RANGES: Record<TimeRange, { label: string; days: number }> = {
  '1M': { label: '1 Month', days: 30 },
  '3M': { label: '3 Months', days: 90 },
  '6M': { label: '6 Months', days: 180 },
  '1Y': { label: '1 Year', days: 365 },
  '3Y': { label: '3 Years', days: 1095 },
  'ALL': { label: 'All Time', days: 1825 },
};

export function HistoricalAnalysisChart({
  company,
  height = 400,
}: HistoricalAnalysisChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [chartType, setChartType] = useState<ChartType>('premium');

  // Generate mock historical data
  const historicalData = useMemo(() => {
    const data: HistoricalDataPoint[] = [];
    const days = TIME_RANGES[timeRange].days;
    const now = new Date();
    
    for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 100))) {
      const date = subDays(now, i);
      const volatility = 0.02; // 2% daily volatility
      
      // Simulate historical values with some trend and volatility
      const trendFactor = 1 + (days - i) / days * 0.2; // 20% growth over period
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      
      const navPerShare = (company.metrics.treasuryValuePerShare || 50) * trendFactor * randomFactor;
      const stockPrice = company.marketData.price * trendFactor * randomFactor * (1 + Math.sin(i / 30) * 0.1);
      const premiumDiscount = ((stockPrice - navPerShare) / navPerShare) * 100;
      
      const dataPoint: HistoricalDataPoint = {
        date: format(date, 'yyyy-MM-dd'),
        timestamp: date,
        navPerShare,
        stockPrice,
        premiumDiscount,
        treasuryValue: company.metrics.treasuryValue * trendFactor * randomFactor,
        shareCount: company.sharesOutstanding * (1 + i / days * 0.05), // 5% dilution over period
        dilutionPercent: (i / days) * 5,
      };
      
      // Add some random transactions
      if (Math.random() < 0.05 && i > 0) {
        dataPoint.transaction = {
          type: Math.random() < 0.7 ? 'buy' : Math.random() < 0.9 ? 'sell' : 'convert',
          amount: Math.random() * 100000000,
          description: dataPoint.transaction?.type === 'buy' ? 'Treasury Bitcoin Purchase' :
                       dataPoint.transaction?.type === 'sell' ? 'Partial Treasury Sale' :
                       'Convertible Note Conversion',
        };
      }
      
      data.push(dataPoint);
    }
    
    return data;
  }, [company, timeRange]);

  // Calculate key statistics
  const statistics = useMemo(() => {
    if (historicalData.length < 2) return null;
    
    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];
    
    const navChange = ((last.navPerShare - first.navPerShare) / first.navPerShare) * 100;
    const stockChange = ((last.stockPrice - first.stockPrice) / first.stockPrice) * 100;
    const avgPremium = historicalData.reduce((sum, d) => sum + d.premiumDiscount, 0) / historicalData.length;
    const maxPremium = Math.max(...historicalData.map(d => d.premiumDiscount));
    const minPremium = Math.min(...historicalData.map(d => d.premiumDiscount));
    
    return {
      navChange,
      stockChange,
      avgPremium,
      maxPremium,
      minPremium,
      volatility: Math.sqrt(
        historicalData.reduce((sum, d, i) => {
          if (i === 0) return 0;
          const returns = Math.log(d.stockPrice / historicalData[i - 1].stockPrice);
          return sum + Math.pow(returns, 2);
        }, 0) / historicalData.length
      ) * Math.sqrt(252) * 100, // Annualized volatility
    };
  }, [historicalData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
        <p className="text-[color:var(--terminal-accent)] font-bold text-sm mb-2">
          {format(new Date(data.date), 'MMM dd, yyyy')}
        </p>
        <div className="space-y-1 text-xs">
          {chartType === 'premium' && (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Stock Price:</span>
                <span className="font-mono text-[color:var(--terminal-text-primary)]">
                  {formatCurrency(data.stockPrice)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">NAV/Share:</span>
                <span className="font-mono text-[color:var(--terminal-text-primary)]">
                  {formatCurrency(data.navPerShare)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Premium:</span>
                <span className={`font-mono ${
                  data.premiumDiscount > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'
                }`}>
                  {formatPercentage(data.premiumDiscount)}
                </span>
              </div>
            </>
          )}
          {chartType === 'nav' && (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">NAV/Share:</span>
                <span className="font-mono text-[color:var(--terminal-text-primary)]">
                  {formatCurrency(data.navPerShare)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Treasury Value:</span>
                <span className="font-mono text-[color:var(--terminal-text-primary)]">
                  {formatCurrency(data.treasuryValue, 0)}
                </span>
              </div>
            </>
          )}
          {data.transaction && (
            <div className="mt-2 pt-2 border-t border-[color:var(--terminal-border)]">
              <p className="font-bold text-[color:var(--terminal-warning)]">
                Transaction: {data.transaction.type.toUpperCase()}
              </p>
              <p className="text-[color:var(--terminal-text-secondary)]">
                {data.transaction.description}
              </p>
              <p className="font-mono text-[color:var(--terminal-text-primary)]">
                {formatCurrency(data.transaction.amount, 0)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'premium':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              
              <ReferenceLine y={0} stroke="var(--terminal-text-muted)" strokeDasharray="5 5" />
              
              <Area
                type="monotone"
                dataKey="premiumDiscount"
                stroke="var(--terminal-accent)"
                fill="var(--terminal-accent)"
                fillOpacity={0.3}
                name="Premium/Discount to NAV"
              />
              
              {/* Mark transactions */}
              {historicalData
                .filter(d => d.transaction)
                .map((d, i) => (
                  <ReferenceLine
                    key={i}
                    x={d.date}
                    stroke="var(--terminal-warning)"
                    strokeDasharray="3 3"
                    label={{
                      value: d.transaction?.type.charAt(0).toUpperCase(),
                      position: 'top',
                      fill: 'var(--terminal-warning)',
                      fontSize: 10,
                    }}
                  />
                ))}
              
              <Brush
                dataKey="date"
                height={30}
                stroke="var(--terminal-border)"
                fill="var(--terminal-bg-dark)"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'nav':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="navPerShare"
                stroke="var(--terminal-accent)"
                strokeWidth={2}
                dot={false}
                name="NAV per Share"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="stockPrice"
                stroke="var(--terminal-success)"
                strokeWidth={2}
                dot={false}
                name="Stock Price"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="treasuryValue"
                stroke="var(--terminal-warning)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                name="Treasury Value"
              />
              
              <Brush
                dataKey="date"
                height={30}
                stroke="var(--terminal-border)"
                fill="var(--terminal-bg-dark)"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'dilution':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1e6).toFixed(0)}M`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              
              <Area
                yAxisId="left"
                type="stepAfter"
                dataKey="shareCount"
                stroke="var(--terminal-accent)"
                fill="var(--terminal-accent)"
                fillOpacity={0.3}
                name="Share Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="dilutionPercent"
                stroke="var(--terminal-error)"
                strokeWidth={2}
                dot={false}
                name="Dilution %"
              />
              
              <Brush
                dataKey="date"
                height={30}
                stroke="var(--terminal-border)"
                fill="var(--terminal-bg-dark)"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <TerminalCard>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historical Analysis - {company.ticker}
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <div className="flex gap-1 bg-[color:var(--terminal-bg-dark)] p-1 rounded">
              {(Object.keys(TIME_RANGES) as TimeRange[]).map(range => (
                <TerminalButton
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'primary' : 'ghost'}
                  onClick={() => setTimeRange(range)}
                  className="px-2 py-1 text-xs"
                >
                  {TIME_RANGES[range].label}
                </TerminalButton>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Type Selector */}
        <div className="flex gap-2 mb-4">
          {[
            { type: 'premium' as ChartType, label: 'Premium/Discount Trend' },
            { type: 'nav' as ChartType, label: 'NAV Progression' },
            { type: 'dilution' as ChartType, label: 'Dilution Impact' },
          ].map(({ type, label }) => (
            <TerminalButton
              key={type}
              size="sm"
              variant={chartType === type ? 'primary' : 'ghost'}
              onClick={() => setChartType(type)}
              className="text-xs"
            >
              {label}
            </TerminalButton>
          ))}
        </div>

        {/* Chart */}
        {renderChart()}

        {/* Statistics */}
        {statistics && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <p className="text-xs text-[color:var(--terminal-text-secondary)]">NAV Change</p>
              <p className={`text-sm font-mono ${
                statistics.navChange > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'
              }`}>
                {formatPercentage(statistics.navChange)}
              </p>
            </div>
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <p className="text-xs text-[color:var(--terminal-text-secondary)]">Stock Change</p>
              <p className={`text-sm font-mono ${
                statistics.stockChange > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'
              }`}>
                {formatPercentage(statistics.stockChange)}
              </p>
            </div>
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <p className="text-xs text-[color:var(--terminal-text-secondary)]">Avg Premium</p>
              <p className={`text-sm font-mono ${
                statistics.avgPremium > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'
              }`}>
                {formatPercentage(statistics.avgPremium)}
              </p>
            </div>
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <p className="text-xs text-[color:var(--terminal-text-secondary)]">Volatility</p>
              <p className="text-sm font-mono text-[color:var(--terminal-warning)]">
                {statistics.volatility.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </TerminalCard>
  );
}