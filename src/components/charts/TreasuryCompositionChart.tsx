'use client';

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Treemap,
} from 'recharts';
import { Bitcoin, DollarSign, Coins, TrendingUp } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';

interface TreasuryCompositionChartProps {
  companies: CompanyWithMetrics[];
  viewMode?: 'single' | 'comparison';
  selectedCompany?: string;
  height?: number;
}

type ChartType = 'pie' | 'bar' | 'treemap';

const CRYPTO_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#00FFA3',
  AVAX: '#E84142',
  MATIC: '#8247E5',
  DOT: '#E6007A',
  LINK: '#2A5ADA',
  UNI: '#FF007A',
  AAVE: '#B6509E',
  SUSHI: '#FA52A0',
};

export function TreasuryCompositionChart({
  companies,
  viewMode = 'single',
  selectedCompany,
  height = 400,
}: TreasuryCompositionChartProps) {
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [selectedTicker, setSelectedTicker] = useState(selectedCompany || companies[0]?.ticker);

  const selectedCompanyData = useMemo(() => {
    return companies.find(c => c.ticker === selectedTicker);
  }, [companies, selectedTicker]);

  // Prepare data for single company pie chart
  const pieData = useMemo(() => {
    if (!selectedCompanyData) return [];
    
    return selectedCompanyData.treasury.map(holding => ({
      name: holding.crypto,
      value: holding.amount * holding.avgCost,
      amount: holding.amount,
      percentage: (holding.amount * holding.avgCost / selectedCompanyData.metrics.treasuryValue) * 100,
    }));
  }, [selectedCompanyData]);

  // Prepare data for comparison bar chart
  const comparisonData = useMemo(() => {
    const cryptoTypes = new Set<string>();
    companies.forEach(company => {
      company.treasury.forEach(holding => {
        cryptoTypes.add(holding.crypto);
      });
    });

    return Array.from(cryptoTypes).map(crypto => {
      const dataPoint: any = { crypto };
      
      companies.forEach(company => {
        const holding = company.treasury.find(h => h.crypto === crypto);
        dataPoint[company.ticker] = holding ? holding.amount * holding.avgCost : 0;
      });
      
      return dataPoint;
    });
  }, [companies]);

  // Prepare data for treemap
  const treemapData = useMemo(() => {
    return companies.map(company => ({
      name: company.ticker,
      children: company.treasury.map(holding => ({
        name: `${company.ticker}-${holding.crypto}`,
        crypto: holding.crypto,
        value: holding.amount * holding.avgCost,
        amount: holding.amount,
        company: company.ticker,
      })),
    }));
  }, [companies]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0];
    
    return (
      <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
        <p className="text-[color:var(--terminal-accent)] font-bold text-sm mb-1">
          {data.name || label}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-[color:var(--terminal-text-secondary)]">Value:</span>
            <span className="text-[color:var(--terminal-text-primary)] font-mono">
              {formatCurrency(data.value)}
            </span>
          </div>
          {data.payload?.amount && (
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--terminal-text-secondary)]">Amount:</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {data.payload.amount.toLocaleString()} {data.name}
              </span>
            </div>
          )}
          {data.payload?.percentage && (
            <div className="flex justify-between gap-3">
              <span className="text-[color:var(--terminal-text-secondary)]">Percentage:</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {formatPercentage(data.payload.percentage)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TreemapContent = ({ x, y, width, height, value, name, crypto }: any) => {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: CRYPTO_COLORS[crypto] || 'var(--terminal-accent)',
            stroke: 'var(--terminal-bg)',
            strokeWidth: 2,
          }}
        />
        {width > 50 && height > 30 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 5}
              textAnchor="middle"
              fill="white"
              fontSize={12}
              fontWeight="bold"
            >
              {crypto}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="white"
              fontSize={10}
            >
              ${(value / 1e6).toFixed(1)}M
            </text>
          </>
        )}
      </g>
    );
  };

  const renderChart = () => {
    if (viewMode === 'single' && chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CRYPTO_COLORS[entry.name] || 'var(--terminal-accent)'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => {
                const item = pieData.find(d => d.name === value);
                return `${value}: ${formatCurrency(item?.value || 0)}`;
              }}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
            <XAxis dataKey="crypto" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="var(--terminal-text-secondary)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `$${(value / 1e6).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {companies.map((company, index) => (
              <Bar
                key={company.ticker}
                dataKey={company.ticker}
                fill={Object.values(CRYPTO_COLORS)[index % Object.values(CRYPTO_COLORS).length]}
                stackId="stack"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'treemap') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={treemapData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="var(--terminal-bg)"
            fill="var(--terminal-accent)"
            content={<TreemapContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <TerminalCard>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Treasury Composition
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex gap-1 bg-[color:var(--terminal-bg-dark)] p-1 rounded">
              {(['pie', 'bar', 'treemap'] as ChartType[]).map(type => (
                <TerminalButton
                  key={type}
                  size="sm"
                  variant={chartType === type ? 'primary' : 'ghost'}
                  onClick={() => setChartType(type)}
                  className="px-2 py-1 text-xs capitalize"
                >
                  {type}
                </TerminalButton>
              ))}
            </div>
          </div>
        </div>

        {/* Company Selector for Single View */}
        {viewMode === 'single' && chartType === 'pie' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {companies.map(company => (
              <button
                key={company.ticker}
                onClick={() => setSelectedTicker(company.ticker)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  selectedTicker === company.ticker
                    ? 'bg-[color:var(--terminal-accent)] text-[color:var(--terminal-bg)]'
                    : 'bg-[color:var(--terminal-bg-dark)] text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-text-primary)]'
                }`}
              >
                {company.ticker}
              </button>
            ))}
          </div>
        )}

        {/* Chart */}
        {renderChart()}

        {/* Summary Stats */}
        {selectedCompanyData && viewMode === 'single' && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <div className="flex items-center justify-between mb-1">
                <Bitcoin className="w-4 h-4 text-[#F7931A]" />
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">Total Assets</span>
              </div>
              <p className="text-sm font-mono text-[color:var(--terminal-text-primary)]">
                {selectedCompanyData.treasury.length} Types
              </p>
            </div>
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="w-4 h-4 text-[color:var(--terminal-success)]" />
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">Total Value</span>
              </div>
              <p className="text-sm font-mono text-[color:var(--terminal-text-primary)]">
                {formatCurrency(selectedCompanyData.metrics.treasuryValue, 0)}
              </p>
            </div>
            <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-4 h-4 text-[color:var(--terminal-warning)]" />
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">Largest Holding</span>
              </div>
              <p className="text-sm font-mono text-[color:var(--terminal-text-primary)]">
                {pieData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
    </TerminalCard>
  );
}