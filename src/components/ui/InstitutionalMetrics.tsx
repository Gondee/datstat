'use client';

import { CompanyWithMetrics } from '@/types';
import { TerminalCard, MetricCard } from '@/components/ui';
import { formatPercentage } from '@/utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Shield, 
  Target,
  Users,
  BarChart3,
  Zap
} from 'lucide-react';

interface InstitutionalMetricsProps {
  company: CompanyWithMetrics;
}

export function InstitutionalMetrics({ company }: InstitutionalMetricsProps) {
  const { metrics } = company;

  // Remove unused helper functions for now

  return (
    <div className="space-y-6">
      {/* Crypto Yield Section */}
      <TerminalCard title="Crypto Yield Performance">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Crypto Yield"
            value={formatPercentage(metrics.cryptoYield.totalCryptoYield)}
            change={metrics.cryptoYield.totalCryptoYield}
            changeType="percentage"
            icon={<Zap className="w-4 h-4" />}
          />
          {metrics.cryptoYield.btcYield && (
            <MetricCard
              title="BTC Yield"
              value={formatPercentage(metrics.cryptoYield.btcYield)}
              change={metrics.cryptoYield.btcYield}
              changeType="percentage"
              icon={<TrendingUp className="w-4 h-4" />}
            />
          )}
          {metrics.cryptoYield.ethYield && (
            <MetricCard
              title="ETH Yield"
              value={formatPercentage(metrics.cryptoYield.ethYield)}
              change={metrics.cryptoYield.ethYield}
              changeType="percentage"
              icon={<TrendingUp className="w-4 h-4" />}
            />
          )}
          {metrics.cryptoYield.solYield && (
            <MetricCard
              title="SOL Yield"
              value={formatPercentage(metrics.cryptoYield.solYield)}
              change={metrics.cryptoYield.solYield}
              changeType="percentage"
              icon={<TrendingUp className="w-4 h-4" />}
            />
          )}
        </div>
      </TerminalCard>

      {/* Dilution Analysis */}
      <TerminalCard title="Dilution & Share Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Dilution Rate"
            value={formatPercentage(metrics.dilutionMetrics.dilutionRate)}
            change={-metrics.dilutionMetrics.dilutionRate}
            changeType="percentage"
            icon={metrics.dilutionMetrics.dilutionRate > 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          />
          <MetricCard
            title="Treasury Accretion"
            value={formatPercentage(metrics.dilutionMetrics.treasuryAccretionRate)}
            change={metrics.dilutionMetrics.treasuryAccretionRate}
            changeType="percentage"
            icon={<Target className="w-4 h-4" />}
          />
          <MetricCard
            title="Share Count Growth"
            value={formatPercentage(metrics.dilutionMetrics.shareCountGrowth)}
            change={-metrics.dilutionMetrics.shareCountGrowth}
            changeType="percentage"
            icon={<Users className="w-4 h-4" />}
          />
          <MetricCard
            title="Dilution-Adj Return"
            value={formatPercentage(metrics.dilutionMetrics.dilutionAdjustedReturn)}
            change={metrics.dilutionMetrics.dilutionAdjustedReturn}
            changeType="percentage"
            icon={<BarChart3 className="w-4 h-4" />}
          />
        </div>
      </TerminalCard>

      {/* Risk Metrics */}
      <TerminalCard title="Risk Assessment">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Implied Volatility</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {formatPercentage(metrics.riskMetrics.impliedVolatility)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Beta</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {metrics.riskMetrics.beta.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Concentration Risk</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {formatPercentage(metrics.riskMetrics.treasuryConcentrationRisk)}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Liquidity Risk</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {formatPercentage(metrics.riskMetrics.liquidityRisk)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">Debt Service Coverage</span>
              <span className={`font-mono ${metrics.riskMetrics.debtServiceCoverage > 1.5 ? 'text-[color:var(--terminal-success)]' : 
                metrics.riskMetrics.debtServiceCoverage > 1.0 ? 'text-[color:var(--terminal-warning)]' : 'text-[color:var(--terminal-danger)]'}`}>
                {metrics.riskMetrics.debtServiceCoverage.toFixed(2)}x
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 border border-[color:var(--terminal-border)] rounded">
              <div className="text-center">
                <div className="text-xl font-bold text-[color:var(--terminal-accent)] mb-1">
                  Overall Risk Score
                </div>
                <div className="text-2xl font-mono mb-2">
                  {/* Risk score would come from RiskAssessment calculation */}
                  <span className="text-[color:var(--terminal-warning)]">65/100</span>
                </div>
                <div className="text-xs text-[color:var(--terminal-text-secondary)]">
                  Medium Risk
                </div>
              </div>
            </div>
          </div>
        </div>
      </TerminalCard>

      {/* Capital Efficiency */}
      <TerminalCard title="Capital Efficiency">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Capital Allocation Score"
            value={`${metrics.capitalEfficiency.capitalAllocationScore.toFixed(0)}/100`}
            change={metrics.capitalEfficiency.capitalAllocationScore - 50}
            changeType="number"
            icon={<Target className="w-4 h-4" />}
          />
          <MetricCard
            title="Treasury ROI"
            value={formatPercentage(metrics.capitalEfficiency.treasuryROI)}
            change={metrics.capitalEfficiency.treasuryROI}
            changeType="percentage"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <MetricCard
            title="Cost of Capital"
            value={formatPercentage(metrics.capitalEfficiency.costOfCapital)}
            change={-metrics.capitalEfficiency.costOfCapital}
            changeType="percentage"
            icon={<TrendingDown className="w-4 h-4" />}
          />
          <MetricCard
            title="Capital Turnover"
            value={`${metrics.capitalEfficiency.capitalTurnover.toFixed(2)}x`}
            change={metrics.capitalEfficiency.capitalTurnover - 1}
            changeType="number"
            icon={<Activity className="w-4 h-4" />}
          />
        </div>
      </TerminalCard>

      {/* Operational Metrics */}
      <TerminalCard title="Operational Intelligence">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Revenue Diversification"
            value={`${metrics.operationalMetrics.revenueDiversification.toFixed(0)}/100`}
            change={metrics.operationalMetrics.revenueDiversification - 50}
            changeType="number"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <MetricCard
            title="Operating Leverage"
            value={formatPercentage(metrics.operationalMetrics.operatingLeverage)}
            change={metrics.operationalMetrics.operatingLeverage}
            changeType="percentage"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricCard
            title="Treasury Focus"
            value={formatPercentage(metrics.operationalMetrics.treasuryFocusRatio)}
            change={metrics.operationalMetrics.treasuryFocusRatio - 50}
            changeType="number"
            icon={<Target className="w-4 h-4" />}
          />
          <MetricCard
            title="Cash Burn Coverage"
            value={`${metrics.operationalMetrics.cashBurnCoverage.toFixed(1)} years`}
            change={metrics.operationalMetrics.cashBurnCoverage - 2}
            changeType="number"
            icon={<Shield className="w-4 h-4" />}
          />
        </div>
      </TerminalCard>

      {/* Capital Structure Summary */}
      <TerminalCard title="Capital Structure Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-green-400 font-semibold">Share Count Analysis</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-green-500/70">Basic Shares:</span>
                <span className="text-green-100 font-mono">
                  {company.capitalStructure.sharesBasic.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Diluted Current:</span>
                <span className="text-green-100 font-mono">
                  {company.capitalStructure.sharesDilutedCurrent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Assumed Diluted:</span>
                <span className="text-red-300 font-mono">
                  {company.capitalStructure.sharesDilutedAssumed.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Float:</span>
                <span className="text-green-100 font-mono">
                  {company.capitalStructure.sharesFloat.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-green-400 font-semibold">Ownership Structure</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-green-500/70">Insider Owned:</span>
                <span className="text-green-100 font-mono">
                  {formatPercentage((company.capitalStructure.sharesInsiderOwned / company.capitalStructure.sharesBasic) * 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Institutional:</span>
                <span className="text-green-100 font-mono">
                  {formatPercentage((company.capitalStructure.sharesInstitutionalOwned / company.capitalStructure.sharesBasic) * 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Convertible Debt:</span>
                <span className="text-yellow-300 font-mono">
                  {company.capitalStructure.convertibleDebt.length} issues
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500/70">Outstanding Warrants:</span>
                <span className="text-yellow-300 font-mono">
                  {company.capitalStructure.warrants.reduce((sum, w) => sum + w.totalWarrants, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}

export default InstitutionalMetrics;