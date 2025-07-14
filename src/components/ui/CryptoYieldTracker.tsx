'use client';

import { CompanyWithMetrics } from '@/types';
import { TerminalCard } from '@/components/ui';
import { formatPercentage } from '@/utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface CryptoYieldTrackerProps {
  company: CompanyWithMetrics;
}

export function CryptoYieldTracker({ company }: CryptoYieldTrackerProps) {
  const { metrics, historicalData = [] } = company;

  // Prepare yield performance data
  const yieldData = historicalData.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    cryptoYield: point.cryptoYield,
    dilutionRate: metrics.dilutionMetrics.dilutionRate,
    stockPrice: point.stockPrice,
    treasuryValue: point.treasuryValue / 1000000000 // Convert to billions
  }));

  // Calculate yield momentum
  const currentYield = metrics.cryptoYield.totalCryptoYield;
  const previousYield = historicalData.length > 1 ? historicalData[historicalData.length - 2]?.cryptoYield || 0 : 0;
  const yieldMomentum = currentYield - previousYield;

  // Treasury efficiency metrics
  const treasuryPerShare = metrics.treasuryValuePerShare;
  const navPerShare = metrics.navPerShare;
  const premiumToNav = metrics.premiumToNavPercent;

  // Remove unused function for now

  return (
    <div className="space-y-6">
      {/* Yield Performance Overview */}
      <TerminalCard title="Crypto Yield Performance Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 border border-[color:var(--terminal-border)] rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Current Crypto Yield</span>
              <Zap className="w-4 h-4 text-[color:var(--terminal-warning)]" />
            </div>
            <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
              {formatPercentage(currentYield)}
            </div>
            <div className={`text-xs flex items-center mt-1 ${
              yieldMomentum >= 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-danger)]'
            }`}>
              {yieldMomentum >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              <span>{yieldMomentum >= 0 && '+'}</span>{formatPercentage(yieldMomentum)} vs previous
            </div>
          </div>

          <div className="p-4 border border-[color:var(--terminal-border)] rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Treasury per Share</span>
              <Activity className="w-4 h-4 text-[color:var(--terminal-primary)]" />
            </div>
            <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
              ${treasuryPerShare.toFixed(0)}
            </div>
            <div className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
              NAV: ${navPerShare.toFixed(0)}
            </div>
          </div>

          <div className="p-4 border border-[color:var(--terminal-border)] rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Premium to NAV</span>
              <TrendingUp className="w-4 h-4 text-[color:var(--terminal-accent)]" />
            </div>
            <div className={`text-2xl font-bold font-mono ${
              premiumToNav > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-danger)]'
            }`}>
              {formatPercentage(premiumToNav)}
            </div>
            <div className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
              {premiumToNav > 0 ? 'Trading at premium' : 'Trading at discount'}
            </div>
          </div>

          <div className="p-4 border border-[color:var(--terminal-border)] rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Dilution Impact</span>
              <Activity className="w-4 h-4 text-[color:var(--terminal-warning)]" />
            </div>
            <div className={`text-2xl font-bold font-mono ${
              metrics.dilutionMetrics.treasuryAccretionRate > 0 ? 'text-[color:var(--terminal-success)]' : 'text-[color:var(--terminal-danger)]'
            }`}>
              {formatPercentage(metrics.dilutionMetrics.treasuryAccretionRate)}
            </div>
            <div className="text-xs text-[color:var(--terminal-text-secondary)] mt-1">
              Treasury accretion rate
            </div>
          </div>
        </div>

        {/* Historical Yield Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="var(--terminal-text-secondary)" 
                fontSize={12}
              />
              <YAxis 
                stroke="var(--terminal-text-secondary)" 
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--terminal-surface)', 
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text-primary)'
                }}
                formatter={(value: number, name: string) => [
                  name === 'cryptoYield' ? `${value}%` : value,
                  name === 'cryptoYield' ? 'Crypto Yield' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="cryptoYield" 
                stroke="var(--chart-primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--chart-primary)', strokeWidth: 2, r: 4 }}
                name="Crypto Yield"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </TerminalCard>

      {/* Yield Breakdown by Asset */}
      <TerminalCard title="Yield Breakdown by Asset">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.cryptoYield.btcYield && (
            <div className="p-4 border border-[color:var(--terminal-border)] rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[color:var(--terminal-warning)] rounded-full mr-2"></div>
                  <span className="text-[color:var(--terminal-accent)] font-semibold">Bitcoin</span>
                </div>
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">BTC</span>
              </div>
              <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.btcYield)}
              </div>
              <div className="text-xs text-[color:var(--terminal-text-secondary)]">
                Primary treasury asset
              </div>
            </div>
          )}

          {metrics.cryptoYield.ethYield && (
            <div className="p-4 border border-[color:var(--terminal-border)] rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[color:var(--terminal-primary)] rounded-full mr-2"></div>
                  <span className="text-[color:var(--terminal-accent)] font-semibold">Ethereum</span>
                </div>
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">ETH</span>
              </div>
              <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.ethYield)}
              </div>
              <div className="text-xs text-[color:var(--terminal-text-secondary)]">
                Staking rewards included
              </div>
            </div>
          )}

          {metrics.cryptoYield.solYield && (
            <div className="p-4 border border-[color:var(--terminal-border)] rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-[color:var(--terminal-accent-light)] rounded-full mr-2"></div>
                  <span className="text-[color:var(--terminal-accent)] font-semibold">Solana</span>
                </div>
                <span className="text-xs text-[color:var(--terminal-text-secondary)]">SOL</span>
              </div>
              <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.solYield)}
              </div>
              <div className="text-xs text-[color:var(--terminal-text-secondary)]">
                High-growth strategy
              </div>
            </div>
          )}
        </div>
      </TerminalCard>

      {/* Dilution vs Yield Analysis */}
      <TerminalCard title="Dilution vs Treasury Accretion">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              {
                name: 'Share Dilution',
                value: metrics.dilutionMetrics.dilutionRate,
                color: 'var(--terminal-danger)'
              },
              {
                name: 'Treasury Accretion',
                value: metrics.dilutionMetrics.treasuryAccretionRate,
                color: 'var(--terminal-success)'
              },
              {
                name: 'Net Crypto Yield',
                value: currentYield,
                color: 'var(--terminal-warning)'
              }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis dataKey="name" stroke="var(--terminal-text-secondary)" fontSize={12} />
              <YAxis stroke="var(--terminal-text-secondary)" fontSize={12} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--terminal-surface)', 
                  border: '1px solid var(--terminal-border)',
                  borderRadius: '4px',
                  color: 'var(--terminal-text-primary)'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Bar 
                dataKey="value" 
                fill="var(--chart-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-[color:var(--terminal-accent)]/5 border border-[color:var(--terminal-border)] rounded">
          <div className="text-sm text-[color:var(--terminal-accent)] font-semibold mb-2">Key Insight:</div>
          <div className="text-sm text-[color:var(--terminal-text-primary)]">
            {metrics.dilutionMetrics.treasuryAccretionRate > 0 
              ? `Successful accretive dilution: Treasury growth (${formatPercentage(metrics.dilutionMetrics.treasuryAccretionRate)}) exceeds share dilution (${formatPercentage(metrics.dilutionMetrics.dilutionRate)})`
              : `Dilutive strategy: Share count growth exceeds treasury accumulation rate`
            }
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}

export default CryptoYieldTracker;