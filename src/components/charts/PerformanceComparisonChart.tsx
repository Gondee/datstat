'use client';

import React, { useState, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ComposedChart,
  Line,
  Bar,
} from 'recharts';
import { Activity, TrendingUp, Target } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';

interface PerformanceComparisonChartProps {
  companies: CompanyWithMetrics[];
  height?: number;
}

type ChartType = 'scatter' | 'radar' | 'correlation' | 'yield';

const COMPANY_COLORS = [
  'var(--terminal-accent)',
  'var(--terminal-success)',
  'var(--terminal-warning)',
  'var(--terminal-error)',
  '#8B5CF6',
  '#06B6D4',
  '#F59E0B',
  '#EC4899',
];

export function PerformanceComparisonChart({
  companies,
  height = 400,
}: PerformanceComparisonChartProps) {
  const [chartType, setChartType] = useState<ChartType>('scatter');
  const [selectedMetrics, setSelectedMetrics] = useState({
    x: 'cryptoYield',
    y: 'stockPerformance',
    size: 'treasuryValue',
  });

  // Prepare scatter plot data (Risk-Return)
  const scatterData = useMemo(() => {
    return companies.map((company, index) => ({
      ticker: company.ticker,
      name: company.name,
      x: company.metrics.premiumToNavPercent,
      y: company.marketData.change24hPercent,
      z: company.metrics.treasuryValue,
      color: COMPANY_COLORS[index % COMPANY_COLORS.length],
      premiumToNav: company.metrics.premiumToNavPercent,
    }));
  }, [companies]);

  // Prepare radar chart data (Multi-metric comparison)
  const radarData = useMemo(() => {
    const metrics = [
      'Treasury Size',
      'Stock Performance',
      'Crypto Performance',
      'Premium to NAV',
      'Volatility',
      'Liquidity',
    ];

    return metrics.map(metric => {
      const dataPoint: any = { metric };
      
      companies.forEach(company => {
        let value = 0;
        switch (metric) {
          case 'Treasury Size':
            value = (company.metrics.treasuryValue / 1e9) * 10; // Scale to 0-100
            break;
          case 'Stock Performance':
            value = Math.min(100, Math.max(0, company.marketData.change24hPercent + 50));
            break;
          case 'Crypto Performance':
            value = Math.min(100, Math.max(0, company.metrics.premiumToNavPercent + 50));
            break;
          case 'Premium to NAV':
            value = Math.min(100, Math.max(0, company.metrics.premiumToNavPercent + 50));
            break;
          case 'Volatility':
            value = Math.min(100, Math.max(0, 100 - Math.abs(company.marketData.change24hPercent)));
            break;
          case 'Liquidity':
            value = Math.min(100, (company.marketData.volume24h / company.marketCap) * 1000);
            break;
        }
        dataPoint[company.ticker] = value;
      });
      
      return dataPoint;
    });
  }, [companies]);

  // Prepare correlation heatmap data
  const correlationData = useMemo(() => {
    // Simple correlation calculation between companies
    const data: any[] = [];
    
    companies.forEach((company1, i) => {
      companies.forEach((company2, j) => {
        if (i <= j) {
          // Calculate simple correlation based on performance metrics
          const correlation = i === j ? 1 : Math.random() * 0.8 - 0.2; // Mock correlation
          
          data.push({
            x: company1.ticker,
            y: company2.ticker,
            value: correlation,
            color: correlation > 0.5 ? 'var(--terminal-success)' : 
                   correlation < -0.5 ? 'var(--terminal-error)' : 
                   'var(--terminal-warning)',
          });
        }
      });
    });
    
    return data;
  }, [companies]);

  // Prepare yield comparison data
  const yieldData = useMemo(() => {
    return companies.map(company => ({
      ticker: company.ticker,
      stockYield: company.marketData.change24hPercent || 0,
      cryptoYield: company.metrics.premiumToNavPercent || 0,
      totalYield: (company.marketData.change24hPercent || 0) + (company.metrics.premiumToNavPercent || 0),
    }));
  }, [companies]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
        <p className="text-[color:var(--terminal-accent)] font-bold text-sm mb-2">
          {data.ticker || data.name}
        </p>
        <div className="space-y-1 text-xs">
          {chartType === 'scatter' && (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Crypto Performance:</span>
                <span className={`font-mono ${data.x > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.x)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Stock Performance:</span>
                <span className={`font-mono ${data.y > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.y)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Treasury Value:</span>
                <span className="font-mono text-[color:var(--terminal-text-primary)]">
                  {formatCurrency(data.z, 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Premium to NAV:</span>
                <span className={`font-mono ${data.premiumToNav > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.premiumToNav)}
                </span>
              </div>
            </>
          )}
          {chartType === 'yield' && (
            <>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Stock Yield:</span>
                <span className={`font-mono ${data.stockYield > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.stockYield)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Crypto Yield:</span>
                <span className={`font-mono ${data.cryptoYield > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.cryptoYield)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[color:var(--terminal-text-secondary)]">Total Yield:</span>
                <span className={`font-mono ${data.totalYield > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-error)]'}`}>
                  {formatPercentage(data.totalYield)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="x"
                name="Crypto Performance"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Crypto Performance (24h)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Stock Performance"
                stroke="var(--terminal-text-secondary)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Stock Performance (24h)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Companies" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--terminal-border)" />
              <PolarAngleAxis dataKey="metric" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--terminal-text-secondary)" tick={{ fontSize: 10 }} />
              {companies.map((company, index) => (
                <Radar
                  key={company.ticker}
                  name={company.ticker}
                  dataKey={company.ticker}
                  stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                  fill={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'yield':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={yieldData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis dataKey="ticker" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="stockYield" fill="var(--terminal-accent)" name="Stock Yield (30d)" />
              <Bar dataKey="cryptoYield" fill="var(--terminal-success)" name="Crypto Yield (30d)" />
              <Line type="monotone" dataKey="totalYield" stroke="var(--terminal-warning)" strokeWidth={2} name="Total Yield" />
            </ComposedChart>
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
            <Activity className="w-5 h-5" />
            Performance Comparison
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex gap-1 bg-[color:var(--terminal-bg-dark)] p-1 rounded">
              {[
                { type: 'scatter' as ChartType, label: 'Risk-Return' },
                { type: 'radar' as ChartType, label: 'Multi-Metric' },
                { type: 'yield' as ChartType, label: 'Yield Analysis' },
              ].map(({ type, label }) => (
                <TerminalButton
                  key={type}
                  size="sm"
                  variant={chartType === type ? 'primary' : 'ghost'}
                  onClick={() => setChartType(type)}
                  className="px-2 py-1 text-xs"
                >
                  {label}
                </TerminalButton>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        {renderChart()}

        {/* Analysis Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {chartType === 'scatter' && (
            <>
              <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
                <div className="flex items-center justify-between mb-1">
                  <Target className="w-4 h-4 text-[color:var(--terminal-accent)]" />
                  <span className="text-xs text-[color:var(--terminal-text-secondary)]">Best Performer</span>
                </div>
                <p className="text-sm font-mono text-[color:var(--terminal-text-primary)]">
                  {scatterData.sort((a, b) => (b.x + b.y) - (a.x + a.y))[0]?.ticker}
                </p>
              </div>
              <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
                <div className="flex items-center justify-between mb-1">
                  <TrendingUp className="w-4 h-4 text-[color:var(--terminal-success)]" />
                  <span className="text-xs text-[color:var(--terminal-text-secondary)]">Highest Alpha</span>
                </div>
                <p className="text-sm font-mono text-[color:var(--terminal-text-primary)]">
                  {scatterData.sort((a, b) => (b.y - b.x) - (a.y - a.x))[0]?.ticker}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </TerminalCard>
  );
}