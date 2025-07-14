'use client';

import React, { useState, useEffect } from 'react';
import {
  TerminalLayout,
  TerminalCard,
  DataTable,
  MetricCard,
  TerminalButton,
  LoadingTerminal,
} from '@/components/ui';

// Mock real-time data generator
const generateRandomChange = (base: number, variance: number) => {
  return base + (Math.random() - 0.5) * variance;
};

const generateTreasuryData = () => {
  const baseData = [
    { symbol: 'T-BILL-1M', maturity: '1 Month', baseYield: 5.20, basePrice: 99.57 },
    { symbol: 'T-BILL-3M', maturity: '3 Month', baseYield: 5.25, basePrice: 98.69 },
    { symbol: 'T-BILL-6M', maturity: '6 Month', baseYield: 5.15, basePrice: 97.43 },
    { symbol: 'T-NOTE-2Y', maturity: '2 Year', baseYield: 4.95, basePrice: 98.25 },
    { symbol: 'T-NOTE-5Y', maturity: '5 Year', baseYield: 4.45, basePrice: 96.50 },
    { symbol: 'T-NOTE-10Y', maturity: '10 Year', baseYield: 4.25, basePrice: 94.75 },
    { symbol: 'T-BOND-30Y', maturity: '30 Year', baseYield: 4.35, basePrice: 88.50 },
  ];

  return baseData.map((item, index) => ({
    id: index + 1,
    symbol: item.symbol,
    maturity: item.maturity,
    yield: generateRandomChange(item.baseYield, 0.1),
    price: generateRandomChange(item.basePrice, 0.5),
    change: generateRandomChange(0, 0.05),
    volume: Math.floor(Math.random() * 500000000) + 100000000,
    bid: item.basePrice - 0.02,
    ask: item.basePrice + 0.02,
    spread: 0.04,
    updated: new Date(),
  }));
};

export default function TreasuryDashboard() {
  const [treasuryData, setTreasuryData] = useState(generateTreasuryData());
  const [loading, setLoading] = useState(true);
  const [selectedSecurity, setSelectedSecurity] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setTreasuryData(generateTreasuryData());
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const columns = [
    { 
      key: 'symbol', 
      header: 'Symbol', 
      align: 'left' as const,
      sticky: true,
    },
    { 
      key: 'maturity', 
      header: 'Maturity', 
      align: 'left' as const,
    },
    { 
      key: 'yield', 
      header: 'Yield %', 
      align: 'right' as const,
      format: (value: number) => value.toFixed(3),
      sortable: true,
    },
    { 
      key: 'price', 
      header: 'Price', 
      align: 'right' as const,
      format: (value: number) => value.toFixed(3),
      sortable: true,
    },
    { 
      key: 'change', 
      header: 'Change %', 
      align: 'right' as const,
      format: (value: number) => (
        <span className={value >= 0 ? 'text-green-300' : 'text-red-400'}>
          {value >= 0 ? '+' : ''}{value.toFixed(3)}
        </span>
      ),
      sortable: true,
    },
    { 
      key: 'bid', 
      header: 'Bid', 
      align: 'right' as const,
      format: (value: number) => value.toFixed(3),
    },
    { 
      key: 'ask', 
      header: 'Ask', 
      align: 'right' as const,
      format: (value: number) => value.toFixed(3),
    },
    { 
      key: 'spread', 
      header: 'Spread', 
      align: 'right' as const,
      format: (value: number) => value.toFixed(3),
    },
    { 
      key: 'volume', 
      header: 'Volume', 
      align: 'right' as const,
      format: (value: number) => `$${(value / 1000000).toFixed(1)}M`,
      sortable: true,
    },
  ];

  // Calculate summary metrics
  const totalVolume = treasuryData.reduce((sum, item) => sum + item.volume, 0);
  const avgYield = treasuryData.reduce((sum, item) => sum + item.yield, 0) / treasuryData.length;
  const positiveChanges = treasuryData.filter(item => item.change > 0).length;
  const negativeChanges = treasuryData.filter(item => item.change < 0).length;

  const sidebarContent = (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-4">
          Quick Actions
        </h2>
        <div className="space-y-2">
          <TerminalButton 
            variant="secondary" 
            size="sm" 
            fullWidth
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause Updates' : 'Resume Updates'}
          </TerminalButton>
          <TerminalButton variant="ghost" size="sm" fullWidth>
            Export Data
          </TerminalButton>
          <TerminalButton variant="ghost" size="sm" fullWidth>
            Configure Alerts
          </TerminalButton>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-4">
          Market Status
        </h2>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-green-600">Market Open</span>
            <span className="text-green-400">9:30 AM EST</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Last Update</span>
            <span className="text-green-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Data Latency</span>
            <span className="text-green-400">{'<'}1ms</span>
          </div>
        </div>
      </div>

      {selectedSecurity && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-4">
            Selected Security
          </h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-green-600">Symbol: </span>
              <span className="text-green-400">{selectedSecurity.symbol}</span>
            </div>
            <div>
              <span className="text-green-600">Yield: </span>
              <span className="text-green-400">{selectedSecurity.yield.toFixed(3)}%</span>
            </div>
            <div>
              <span className="text-green-600">Price: </span>
              <span className="text-green-400">${selectedSecurity.price.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <TerminalLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingTerminal
            message="Initializing Treasury Analytics Platform"
            steps={[
              'Connecting to Federal Reserve data feeds...',
              'Loading historical market data...',
              'Calculating yield curves...',
              'Preparing real-time analytics...',
            ]}
          />
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout
      sidebarContent={sidebarContent}
      onSearch={(query) => console.log('Search:', query)}
      onCommand={(cmd) => console.log('Command:', cmd)}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-green-400">
              Treasury Securities Monitor
            </h1>
            <p className="text-sm text-green-600 mt-1">
              Real-time U.S. Treasury market data and analytics
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {autoRefresh && (
              <>
                <span className="text-green-600">AUTO-REFRESH</span>
                <div className="animate-pulse h-2 w-2 bg-green-400 rounded-full" />
              </>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Volume"
            value={`$${(totalVolume / 1000000000).toFixed(2)}B`}
            change={2.5}
            isRealtime={autoRefresh}
          />
          <MetricCard
            label="Avg Yield"
            value={`${avgYield.toFixed(3)}%`}
            change={-0.02}
            changeLabel="vs prev close"
            isRealtime={autoRefresh}
          />
          <MetricCard
            label="Advancing"
            value={positiveChanges}
            status="positive"
            format={(v) => v.toString()}
          />
          <MetricCard
            label="Declining"
            value={negativeChanges}
            status="negative"
            format={(v) => v.toString()}
          />
        </div>

        {/* Main Data Table */}
        <TerminalCard 
          title="Live Treasury Quotes" 
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600">
                {treasuryData.length} Securities
              </span>
            </div>
          }
        >
          <DataTable
            data={treasuryData}
            columns={columns}
            onRowClick={(row) => setSelectedSecurity(row)}
            selectedRow={treasuryData.findIndex(d => d.id === selectedSecurity?.id)}
            striped
            flashOnUpdate
            stickyHeader
            compact
          />
        </TerminalCard>

        {/* Additional Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TerminalCard title="Market Commentary">
            <div className="space-y-2 text-sm">
              <p className="text-green-400">
                Treasury yields remain stable with minor fluctuations across the curve.
              </p>
              <p className="text-green-600">
                The 10-year benchmark holding steady near 4.25% as markets await Fed guidance.
              </p>
            </div>
          </TerminalCard>

          <TerminalCard title="System Status">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Data Feed</span>
                <span className="text-green-400 flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">API Status</span>
                <span className="text-green-400">Operational</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Last Sync</span>
                <span className="text-green-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </TerminalCard>
        </div>
      </div>
    </TerminalLayout>
  );
}