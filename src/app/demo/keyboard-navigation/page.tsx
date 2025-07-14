'use client';

import React, { useState } from 'react';
import { KeyboardNavigationProvider } from '@/contexts/KeyboardNavigationContext';
import { NavigableTable } from '@/components/keyboard/NavigableTable';
import { SearchInput } from '@/components/keyboard/SearchInput';
import { Company } from '@/types/models';

// Sample data for demonstration
const sampleCompanies: Company[] = [
  {
    ticker: 'MSTR',
    name: 'MicroStrategy Inc.',
    description: 'Business intelligence company',
    sector: 'Technology',
    exchange: 'NASDAQ',
    website: 'https://www.microstrategy.com',
    treasuryHoldings: [
      {
        id: '1',
        cryptoType: 'BTC',
        amount: 189150,
        costBasis: 5.885e9,
        averagePurchasePrice: 31168,
        currentValue: 7.5e9,
        unrealizedGainLoss: 1.615e9,
        percentOfTotalHoldings: 100,
        lastUpdated: new Date(),
        transactions: [],
      },
    ],
    financialMetrics: {
      marketCap: 25e9,
      enterpriseValue: 26e9,
      revenue: 500e6,
      netIncome: -50e6,
      totalAssets: 8e9,
      totalLiabilities: 2.5e9,
      shareholdersEquity: 5.5e9,
      sharesOutstanding: 10e6,
      lastUpdated: new Date(),
    },
    stockPrice: {
      current: 400,
      open: 395,
      high: 410,
      low: 390,
      close: 400,
      volume: 5e6,
      marketCap: 25e9,
      change: 5,
      changePercent: 1.25,
      lastUpdated: new Date(),
    },
    calculatedMetrics: {
      totalTreasuryValue: 7.5e9,
      treasuryValuePerShare: 750,
      netAssetValue: 13e9,
      navPerShare: 1300,
      premiumToNav: -900,
      premiumToNavPercent: -69.23,
      treasuryAsPercentOfMarketCap: 30,
      enterpriseValueToTreasury: 3.47,
    },
    lastUpdated: new Date(),
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    description: 'Electric vehicle manufacturer',
    sector: 'Automotive',
    exchange: 'NASDAQ',
    website: 'https://www.tesla.com',
    treasuryHoldings: [
      {
        id: '2',
        cryptoType: 'BTC',
        amount: 9720,
        costBasis: 1.5e9,
        averagePurchasePrice: 31620,
        currentValue: 450e6,
        unrealizedGainLoss: -1.05e9,
        percentOfTotalHoldings: 100,
        lastUpdated: new Date(),
        transactions: [],
      },
    ],
    financialMetrics: {
      marketCap: 800e9,
      enterpriseValue: 810e9,
      revenue: 80e9,
      netIncome: 12e9,
      totalAssets: 100e9,
      totalLiabilities: 30e9,
      shareholdersEquity: 70e9,
      sharesOutstanding: 3.2e9,
      lastUpdated: new Date(),
    },
    stockPrice: {
      current: 250,
      open: 248,
      high: 255,
      low: 245,
      close: 250,
      volume: 100e6,
      marketCap: 800e9,
      change: 2,
      changePercent: 0.8,
      lastUpdated: new Date(),
    },
    calculatedMetrics: {
      totalTreasuryValue: 450e6,
      treasuryValuePerShare: 0.14,
      netAssetValue: 70.45e9,
      navPerShare: 22.02,
      premiumToNav: 227.98,
      premiumToNavPercent: 1035.24,
      treasuryAsPercentOfMarketCap: 0.056,
      enterpriseValueToTreasury: 1800,
    },
    lastUpdated: new Date(),
  },
];

export default function KeyboardNavigationDemo() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleRowSelect = (company: Company, index: number) => {
    setSelectedRows(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const tableColumns = [
    {
      key: 'ticker',
      header: 'Ticker',
      sortable: true,
      width: '100px',
    },
    {
      key: 'name',
      header: 'Company',
      sortable: true,
    },
    {
      key: 'sector',
      header: 'Sector',
      sortable: true,
    },
    {
      key: 'btcHoldings',
      header: 'BTC Holdings',
      render: (company: Company) => {
        const btcHolding = company.treasuryHoldings.find(h => h.cryptoType === 'BTC');
        return btcHolding ? btcHolding.amount.toLocaleString() : '0';
      },
      sortable: true,
    },
    {
      key: 'treasuryValue',
      header: 'Treasury Value',
      render: (company: Company) => 
        `$${(company.calculatedMetrics.totalTreasuryValue / 1e9).toFixed(2)}B`,
      sortable: true,
    },
    {
      key: 'premium',
      header: 'Premium to NAV',
      render: (company: Company) => 
        `${company.calculatedMetrics.premiumToNavPercent.toFixed(2)}%`,
      sortable: true,
    },
  ];

  return (
    <KeyboardNavigationProvider
      companies={sampleCompanies}
      onCompanySelect={handleCompanySelect}
    >
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Keyboard Navigation Demo
            </h1>
            <p className="mt-2 text-gray-600">
              Try the keyboard shortcuts: Press <kbd className="px-2 py-1 bg-gray-100 rounded">?</kbd> for help,
              <kbd className="px-2 py-1 bg-gray-100 rounded ml-1">⌘K</kbd> for command palette
            </p>
          </div>

          {/* Search */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Search Companies</h2>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by ticker or company name..."
              suggestions={['MSTR', 'TSLA', 'SQ', 'COIN']}
              onSuggestionSelect={(suggestion) => {
                console.log('Selected:', suggestion);
              }}
            />
          </div>

          {/* Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Company Holdings</h2>
              <div className="text-sm text-gray-600">
                Press <kbd className="px-2 py-1 bg-gray-100 rounded">i</kbd> to enter vim mode for navigation
              </div>
            </div>
            <NavigableTable
              data={sampleCompanies}
              columns={tableColumns}
              onRowClick={handleCompanySelect}
              onRowSelect={handleRowSelect}
              selectedRows={selectedRows}
            />
          </div>

          {/* Selected Company Details */}
          {selectedCompany && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Selected Company</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="font-semibold">{selectedCompany.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ticker</p>
                  <p className="font-semibold">{selectedCompany.ticker}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sector</p>
                  <p className="font-semibold">{selectedCompany.sector}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Market Cap</p>
                  <p className="font-semibold">
                    ${(selectedCompany.financialMetrics.marketCap / 1e9).toFixed(2)}B
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Start Guide</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">/</kbd> to focus the search input</li>
              <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">⌘K</kbd> to open the command palette</li>
              <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">i</kbd> to enter vim mode for table navigation</li>
              <li>• In vim mode, use <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">j</kbd>/<kbd className="px-1.5 py-0.5 bg-blue-100 rounded">k</kbd> to move up/down</li>
              <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">Enter</kbd> to select a row</li>
              <li>• Press <kbd className="px-1.5 py-0.5 bg-blue-100 rounded">?</kbd> to see all keyboard shortcuts</li>
            </ul>
          </div>
        </div>
      </div>
    </KeyboardNavigationProvider>
  );
}