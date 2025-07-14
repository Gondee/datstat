'use client';

import React, { useState } from 'react';
import {
  TerminalLayout,
  TerminalCard,
  DataTable,
  MetricCard,
  TerminalButton,
  TerminalInput,
  LoadingTerminal,
  PulseIndicator,
} from '@/components/ui';

// Sample data for the data table
const sampleData = [
  { id: 1, symbol: 'T-BILL-3M', yield: 5.25, change: 0.02, volume: 125000000, status: 'active' },
  { id: 2, symbol: 'T-BILL-6M', yield: 5.15, change: -0.01, volume: 98000000, status: 'active' },
  { id: 3, symbol: 'T-NOTE-2Y', yield: 4.95, change: 0.05, volume: 450000000, status: 'active' },
  { id: 4, symbol: 'T-NOTE-5Y', yield: 4.45, change: -0.03, volume: 380000000, status: 'active' },
  { id: 5, symbol: 'T-NOTE-10Y', yield: 4.25, change: 0.01, volume: 620000000, status: 'active' },
  { id: 6, symbol: 'T-BOND-30Y', yield: 4.35, change: 0.00, volume: 290000000, status: 'active' },
];

const columns = [
  { key: 'symbol', header: 'Symbol', align: 'left' as const, sticky: true },
  { 
    key: 'yield', 
    header: 'Yield %', 
    align: 'right' as const,
    format: (value: number) => value.toFixed(2),
    sortable: true,
  },
  { 
    key: 'change', 
    header: 'Change', 
    align: 'right' as const,
    format: (value: number) => (
      <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    ),
    sortable: true,
  },
  { 
    key: 'volume', 
    header: 'Volume', 
    align: 'right' as const,
    format: (value: number) => (value / 1000000).toFixed(1) + 'M',
    sortable: true,
  },
  { 
    key: 'status', 
    header: 'Status', 
    align: 'center' as const,
    format: (value: string) => (
      <div className="flex items-center justify-center gap-2">
        <PulseIndicator size="sm" color="green" />
        <span className="uppercase text-xs">{value}</span>
      </div>
    ),
  },
];

export default function TerminalUIDemo() {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedRow, setSelectedRow] = useState<number | undefined>();

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const handleCommand = (command: string) => {
    console.log('Command:', command);
  };

  const sidebarContent = (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-4">
        Navigation
      </h2>
      <nav className="space-y-2">
        {['Dashboard', 'Securities', 'Analytics', 'Reports', 'Settings'].map((item) => (
          <button
            key={item}
            className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-sm transition-colors"
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <TerminalLayout
      sidebarContent={sidebarContent}
      onSearch={handleSearch}
      onCommand={handleCommand}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-green-400 mb-2">
            Terminal UI Components
          </h1>
          <p className="text-sm text-green-600">
            DAT Analytics Platform - Component Library Demo
          </p>
        </div>

        {/* Metric Cards */}
        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-green-400 mb-4">
            Metrics Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Volume"
              value="2.5B"
              change={5.2}
              status="positive"
              isRealtime
            />
            <MetricCard
              label="Avg Yield"
              value="4.75%"
              change={-0.8}
              status="negative"
            />
            <MetricCard
              label="Active Securities"
              value={6}
              change={0}
              status="neutral"
              format={(v) => v.toString()}
            />
            <MetricCard
              label="Last Update"
              value="12:45:32"
              isRealtime
            />
          </div>
        </section>

        {/* Data Table */}
        <section>
          <TerminalCard title="Treasury Securities" className="overflow-hidden">
            <DataTable
              data={sampleData}
              columns={columns}
              selectedRow={selectedRow}
              onRowClick={(_, index) => setSelectedRow(index)}
              striped
              flashOnUpdate
              stickyHeader
            />
          </TerminalCard>
        </section>

        {/* Form Controls */}
        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-green-400 mb-4">
            Form Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TerminalCard title="Input Controls">
              <div className="space-y-4">
                <TerminalInput
                  label="Security Code"
                  placeholder="Enter security code..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  hint="Format: T-TYPE-DURATION"
                />
                <TerminalInput
                  label="Amount"
                  type="number"
                  placeholder="0.00"
                  prefix="$"
                  suffix="USD"
                />
                <TerminalInput
                  label="Password"
                  type="password"
                  placeholder="Enter password..."
                  error="Invalid credentials"
                />
              </div>
            </TerminalCard>

            <TerminalCard title="Button Variants">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <TerminalButton>Primary</TerminalButton>
                  <TerminalButton variant="secondary">Secondary</TerminalButton>
                  <TerminalButton variant="danger">Danger</TerminalButton>
                  <TerminalButton variant="ghost">Ghost</TerminalButton>
                </div>
                <div className="flex gap-2">
                  <TerminalButton size="sm">Small</TerminalButton>
                  <TerminalButton size="md">Medium</TerminalButton>
                  <TerminalButton size="lg">Large</TerminalButton>
                </div>
                <TerminalButton fullWidth loading={loading} onClick={() => setLoading(!loading)}>
                  {loading ? 'Processing...' : 'Toggle Loading'}
                </TerminalButton>
              </div>
            </TerminalCard>
          </div>
        </section>

        {/* Loading States */}
        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-green-400 mb-4">
            Loading States
          </h2>
          <LoadingTerminal
            steps={[
              'Connecting to data feeds...',
              'Authenticating session...',
              'Loading market data...',
              'Calculating analytics...',
            ]}
          />
        </section>

        {/* Card Variants */}
        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-green-400 mb-4">
            Card Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TerminalCard variant="default" title="Default Card">
              <p className="text-sm">Standard terminal card with border and padding.</p>
            </TerminalCard>
            <TerminalCard variant="compact" title="Compact Card">
              <p className="text-sm">Minimal styling for dense layouts.</p>
            </TerminalCard>
            <TerminalCard variant="bordered" title="Bordered Card">
              <p className="text-sm">Enhanced border for emphasis.</p>
            </TerminalCard>
          </div>
        </section>
      </div>
    </TerminalLayout>
  );
}