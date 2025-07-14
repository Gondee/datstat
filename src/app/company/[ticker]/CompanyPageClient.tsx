'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, DollarSign, Coins, Activity } from 'lucide-react';
import { useCompanies } from '@/utils/store';
import { TerminalCard, MetricCard, DataTable, TerminalButton, Column, InstitutionalMetrics, CryptoYieldTracker } from '@/components/ui';
import { formatCurrency, formatPercentage, getChangeColor } from '@/utils/formatters';
import { TreasuryTransaction } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CompanyPageClientProps {
  ticker: string;
}

export default function CompanyPageClient({ ticker }: CompanyPageClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'transactions' | 'performance' | 'institutional' | 'yield'>('overview');
  const router = useRouter();
  const companies = useCompanies();
  
  const company = companies.find(c => c.ticker === ticker.toUpperCase());

  if (!company) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <TerminalCard>
          <div className="text-center py-8">
            <h2 className="text-xl text-[color:var(--terminal-accent)] mb-4">Company Not Found</h2>
            <p className="text-[color:var(--terminal-text-secondary)] mb-4">
              No company found with ticker: {ticker.toUpperCase()}
            </p>
            <TerminalButton onClick={() => router.push('/')}>
              Back to Dashboard
            </TerminalButton>
          </div>
        </TerminalCard>
      </div>
    );
  }

  // Mock historical data for charts
  const historicalData = [
    { date: '2024-01', stockPrice: 1200, treasuryValue: 11500000000, premiumToNav: 15.2 },
    { date: '2024-02', stockPrice: 1350, treasuryValue: 11800000000, premiumToNav: 18.7 },
    { date: '2024-03', stockPrice: 1450, treasuryValue: 12100000000, premiumToNav: 22.1 },
    { date: '2024-04', stockPrice: 1380, treasuryValue: 12300000000, premiumToNav: 19.8 },
    { date: '2024-05', stockPrice: 1520, treasuryValue: 12800000000, premiumToNav: 24.5 },
  ];

  // Colors for pie chart
  const COLORS = ['var(--chart-primary)', 'var(--chart-tertiary)', 'var(--chart-danger)', 'var(--chart-quaternary)'];

  // Transaction columns
  const transactionColumns: Column<TreasuryTransaction>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-mono uppercase ${
          value === 'purchase' ? 'bg-[color:var(--terminal-success)]/20 text-[color:var(--terminal-success)]' : 'bg-[color:var(--terminal-danger)]/20 text-[color:var(--terminal-danger)]'
        }`}>
          {value as string}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (value) => (
        <span className="font-mono">
          {(value as number).toLocaleString()} {company.treasury[0].crypto}
        </span>
      ),
    },
    {
      key: 'pricePerUnit',
      label: 'Price per Unit',
      align: 'right',
      render: (value) => <span className="font-mono">{formatCurrency(value as number)}</span>,
    },
    {
      key: 'totalCost',
      label: 'Total Cost',
      align: 'right',
      render: (value) => <span className="font-mono">{formatCurrency(value as number)}</span>,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Company Info */}
            <TerminalCard title="Company Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[color:var(--terminal-accent)] font-semibold text-lg">{company.name}</h3>
                    <p className="text-[color:var(--terminal-text-secondary)] text-sm">{company.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Sector:</span>
                      <p className="text-[color:var(--terminal-text-primary)]">{company.sector}</p>
                    </div>
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Shares Outstanding:</span>
                      <p className="text-[color:var(--terminal-text-primary)] font-mono">{company.sharesOutstanding.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Market Cap:</span>
                      <p className="text-[color:var(--terminal-text-primary)] font-mono">{formatCurrency(company.marketCap, 0)}</p>
                    </div>
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Total Debt:</span>
                      <p className="text-[color:var(--terminal-text-primary)] font-mono">{formatCurrency(company.totalDebt, 0)}</p>
                    </div>
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Shareholders&apos; Equity:</span>
                      <p className="text-[color:var(--terminal-text-primary)] font-mono">{formatCurrency(company.shareholdersEquity, 0)}</p>
                    </div>
                    <div>
                      <span className="text-[color:var(--terminal-text-secondary)]">Last Updated:</span>
                      <p className="text-[color:var(--terminal-text-primary)] font-mono text-xs">
                        {new Date(company.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalCard>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Stock Price"
                value={formatCurrency(company.marketData.price)}
                change={company.marketData.change24hPercent}
                changeType="percentage"
                icon={<DollarSign className="w-4 h-4" />}
              />
              <MetricCard
                title="Treasury Value"
                value={formatCurrency(company.metrics.treasuryValue, 0)}
                icon={<Coins className="w-4 h-4" />}
              />
              <MetricCard
                title="Premium to NAV"
                value={formatPercentage(company.metrics.premiumToNavPercent)}
                change={company.metrics.premiumToNavPercent}
                changeType="percentage"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <MetricCard
                title="Treasury per Share"
                value={formatCurrency(company.metrics.treasuryValuePerShare)}
                icon={<Activity className="w-4 h-4" />}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TerminalCard title="Stock vs Treasury Performance">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
                    <XAxis dataKey="date" stroke="var(--terminal-text-secondary)" />
                    <YAxis stroke="var(--terminal-text-secondary)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--terminal-surface)', 
                        border: '1px solid var(--terminal-border)',
                        borderRadius: '4px',
                        color: 'var(--terminal-text-primary)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stockPrice" 
                      stroke="var(--chart-primary)" 
                      strokeWidth={2}
                      name="Stock Price"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TerminalCard>

              <TerminalCard title="Premium to NAV Trend">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
                    <XAxis dataKey="date" stroke="var(--terminal-text-secondary)" />
                    <YAxis stroke="var(--terminal-text-secondary)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--terminal-surface)', 
                        border: '1px solid var(--terminal-border)',
                        borderRadius: '4px',
                        color: 'var(--terminal-text-primary)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="premiumToNav" 
                      stroke="var(--chart-tertiary)" 
                      strokeWidth={2}
                      name="Premium to NAV %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TerminalCard>
            </div>
          </div>
        );

      case 'holdings':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {company.treasury.map((holding) => (
                <TerminalCard key={holding.crypto} title={`${holding.crypto} Holdings`}>
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                        {holding.amount.toLocaleString()}
                      </h3>
                      <p className="text-[color:var(--terminal-text-secondary)] text-sm">{holding.crypto}</p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[color:var(--terminal-text-secondary)]">Current Value:</span>
                        <span className="text-[color:var(--terminal-text-primary)] font-mono">
                          {formatCurrency(holding.currentValue, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[color:var(--terminal-text-secondary)]">Avg Cost Basis:</span>
                        <span className="text-[color:var(--terminal-text-primary)] font-mono">
                          {formatCurrency(holding.averageCostBasis)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[color:var(--terminal-text-secondary)]">Total Cost:</span>
                        <span className="text-[color:var(--terminal-text-primary)] font-mono">
                          {formatCurrency(holding.totalCost, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[color:var(--terminal-text-secondary)]">Unrealized Gain:</span>
                        <span className={`font-mono ${getChangeColor(holding.unrealizedGainPercent)}`}>
                          {formatCurrency(holding.unrealizedGain, 0)} ({formatPercentage(holding.unrealizedGainPercent)})
                        </span>
                      </div>
                      {holding.stakingYield && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--terminal-text-secondary)]">Staking Yield:</span>
                            <span className="text-[color:var(--terminal-text-primary)] font-mono">
                              {holding.stakingYield}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--terminal-text-secondary)]">Staked Amount:</span>
                            <span className="text-[color:var(--terminal-text-primary)] font-mono">
                              {holding.stakedAmount?.toLocaleString()} {holding.crypto}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TerminalCard>
              ))}
            </div>

            {/* Holdings Distribution Chart */}
            <TerminalCard title="Holdings Distribution">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={company.treasury.map(holding => ({
                        name: holding.crypto,
                        value: holding.currentValue,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {company.treasury.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--terminal-surface)', 
                        border: '1px solid var(--terminal-border)',
                        borderRadius: '4px',
                        color: 'var(--terminal-text-primary)'
                      }}
                      formatter={(value: number) => [formatCurrency(value, 0), 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TerminalCard>
          </div>
        );

      case 'transactions':
        const allTransactions = company.treasury.flatMap(holding => holding.transactions);
        return (
          <TerminalCard title="Transaction History">
            <DataTable
              data={allTransactions as unknown as Record<string, unknown>[]}
              columns={transactionColumns as unknown as Column<Record<string, unknown>>[]}
              keyboardNavigation={true}
            />
          </TerminalCard>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <TerminalCard title="Performance Comparison">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
                  <XAxis dataKey="date" stroke="var(--terminal-text-secondary)" />
                  <YAxis stroke="var(--terminal-text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--terminal-surface)', 
                      border: '1px solid var(--terminal-border)',
                      borderRadius: '4px',
                      color: 'var(--terminal-text-primary)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stockPrice" 
                    stroke="var(--chart-primary)" 
                    strokeWidth={2}
                    name="Stock Price"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="premiumToNav" 
                    stroke="var(--chart-tertiary)" 
                    strokeWidth={2}
                    name="Premium to NAV %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TerminalCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="52-Week Performance"
                value="+145.8%"
                change={145.8}
                changeType="percentage"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <MetricCard
                title="Volatility (30d)"
                value="24.5%"
                icon={<Activity className="w-4 h-4" />}
              />
              <MetricCard
                title="Beta"
                value="1.85"
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </div>
          </div>
        );

      case 'institutional':
        return <InstitutionalMetrics company={company} />;

      case 'yield':
        return <CryptoYieldTracker company={company} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--terminal-black)] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <TerminalButton
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </TerminalButton>
          
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">{company.ticker}</h1>
              <span className={`text-lg ${getChangeColor(company.marketData.change24hPercent)}`}>
                {formatPercentage(company.marketData.change24hPercent)}
              </span>
            </div>
            <p className="text-[color:var(--terminal-text-secondary)]">{company.name}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-[color:var(--terminal-border)]">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'holdings', label: 'Holdings' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'performance', label: 'Performance' },
            { key: 'institutional', label: 'Institutional' },
            { key: 'yield', label: 'Crypto Yield' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'holdings' | 'transactions' | 'performance' | 'institutional' | 'yield')}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                activeTab === tab.key
                  ? 'text-[color:var(--terminal-accent)] border-b-2 border-[color:var(--terminal-accent)]'
                  : 'text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-accent)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}