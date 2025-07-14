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
          <div className="p-4 border border-green-500/20 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-500/70 text-sm">Current Crypto Yield</span>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 font-mono">
              {formatPercentage(currentYield)}
            </div>
            <div className={`text-xs flex items-center mt-1 ${
              yieldMomentum >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {yieldMomentum >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {yieldMomentum >= 0 ? '+' : ''}{formatPercentage(yieldMomentum)} vs previous
            </div>
          </div>

          <div className="p-4 border border-green-500/20 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-500/70 text-sm">Treasury per Share</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 font-mono">
              ${treasuryPerShare.toFixed(0)}
            </div>
            <div className="text-xs text-green-500/70 mt-1">
              NAV: ${navPerShare.toFixed(0)}
            </div>
          </div>

          <div className="p-4 border border-green-500/20 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-500/70 text-sm">Premium to NAV</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className={`text-2xl font-bold font-mono ${
              premiumToNav > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(premiumToNav)}
            </div>
            <div className="text-xs text-green-500/70 mt-1">
              {premiumToNav > 0 ? 'Trading at premium' : 'Trading at discount'}
            </div>
          </div>

          <div className="p-4 border border-green-500/20 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-500/70 text-sm">Dilution Impact</span>
              <Activity className="w-4 h-4 text-orange-400" />
            </div>
            <div className={`text-2xl font-bold font-mono ${
              metrics.dilutionMetrics.treasuryAccretionRate > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercentage(metrics.dilutionMetrics.treasuryAccretionRate)}
            </div>
            <div className="text-xs text-green-500/70 mt-1">
              Treasury accretion rate
            </div>
          </div>
        </div>

        {/* Historical Yield Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                stroke="#10b981" 
                fontSize={12}
              />
              <YAxis 
                stroke="#10b981" 
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  color: '#10b981'
                }}
                formatter={(value: number, name: string) => [
                  name === 'cryptoYield' ? `${value}%` : value,
                  name === 'cryptoYield' ? 'Crypto Yield' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="cryptoYield" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
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
            <div className="p-4 border border-green-500/20 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-green-400 font-semibold">Bitcoin</span>
                </div>
                <span className="text-xs text-green-500/70">BTC</span>
              </div>
              <div className="text-2xl font-bold text-green-400 font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.btcYield)}
              </div>
              <div className="text-xs text-green-500/70">
                Primary treasury asset
              </div>
            </div>
          )}

          {metrics.cryptoYield.ethYield && (
            <div className="p-4 border border-green-500/20 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-green-400 font-semibold">Ethereum</span>
                </div>
                <span className="text-xs text-green-500/70">ETH</span>
              </div>
              <div className="text-2xl font-bold text-green-400 font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.ethYield)}
              </div>
              <div className="text-xs text-green-500/70">
                Staking rewards included
              </div>
            </div>
          )}

          {metrics.cryptoYield.solYield && (
            <div className="p-4 border border-green-500/20 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-green-400 font-semibold">Solana</span>
                </div>
                <span className="text-xs text-green-500/70">SOL</span>
              </div>
              <div className="text-2xl font-bold text-green-400 font-mono mb-2">
                {formatPercentage(metrics.cryptoYield.solYield)}
              </div>
              <div className="text-xs text-green-500/70">
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
                color: '#ef4444'
              },
              {
                name: 'Treasury Accretion',
                value: metrics.dilutionMetrics.treasuryAccretionRate,
                color: '#10b981'
              },
              {
                name: 'Net Crypto Yield',
                value: currentYield,
                color: '#f59e0b'
              }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
              <XAxis dataKey="name" stroke="#10b981" fontSize={12} />
              <YAxis stroke="#10b981" fontSize={12} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  color: '#10b981'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Bar 
                dataKey="value" 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded">
          <div className="text-sm text-green-400 font-semibold mb-2">Key Insight:</div>
          <div className="text-sm text-green-100">
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