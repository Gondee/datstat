'use client';

import React, { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Shield, AlertTriangle, Activity, TrendingDown } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { formatPercentage, formatCurrency } from '@/utils/formatters';
import { CompanyWithMetrics } from '@/types';

interface RiskVisualizationDashboardProps {
  companies: CompanyWithMetrics[];
  selectedCompany?: string;
  height?: number;
}

type ChartType = 'scorecard' | 'var' | 'beta' | 'concentration';

const RISK_COLORS = {
  low: 'var(--terminal-success)',
  medium: 'var(--terminal-warning)',
  high: 'var(--terminal-error)',
  critical: '#991B1B',
};

const getRiskColor = (score: number) => {
  if (score < 30) return RISK_COLORS.low;
  if (score < 60) return RISK_COLORS.medium;
  if (score < 80) return RISK_COLORS.high;
  return RISK_COLORS.critical;
};

export function RiskVisualizationDashboard({
  companies,
  selectedCompany,
  height = 400,
}: RiskVisualizationDashboardProps) {
  const [chartType, setChartType] = useState<ChartType>('scorecard');
  const [selectedTicker, setSelectedTicker] = useState(selectedCompany || companies[0]?.ticker);

  const selectedCompanyData = useMemo(() => {
    return companies.find(c => c.ticker === selectedTicker);
  }, [companies, selectedTicker]);

  // Risk scorecard data
  const riskScoreData = useMemo(() => {
    if (!selectedCompanyData) return [];

    const risks = [
      { metric: 'Market Risk', value: Math.random() * 100, max: 100 },
      { metric: 'Liquidity Risk', value: Math.random() * 100, max: 100 },
      { metric: 'Concentration Risk', value: Math.random() * 100, max: 100 },
      { metric: 'Volatility Risk', value: selectedCompanyData.marketData.volatility30d || 50, max: 100 },
      { metric: 'Regulatory Risk', value: Math.random() * 100, max: 100 },
      { metric: 'Operational Risk', value: Math.random() * 100, max: 100 },
    ];

    return risks;
  }, [selectedCompanyData]);

  // VaR (Value at Risk) data
  const varData = useMemo(() => {
    const days = 30;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      data.push({
        date: date.toISOString().split('T')[0],
        var95: Math.random() * 10 + 5,
        var99: Math.random() * 15 + 10,
        actual: Math.random() * 20 - 10,
      });
    }
    
    return data;
  }, []);

  // Beta analysis data
  const betaData = useMemo(() => {
    return companies.map(company => ({
      ticker: company.ticker,
      stockBeta: 1 + (Math.random() - 0.5) * 2,
      cryptoBeta: 1.5 + (Math.random() - 0.5) * 3,
      combinedBeta: 1.2 + (Math.random() - 0.5) * 2.5,
    }));
  }, [companies]);

  // Concentration risk data
  const concentrationData = useMemo(() => {
    if (!selectedCompanyData) return [];

    const totalValue = selectedCompanyData.metrics.treasuryValue;
    
    return selectedCompanyData.treasury.map(holding => {
      const percentage = (holding.amount * holding.avgCost) / totalValue * 100;
      return {
        name: holding.crypto,
        value: percentage,
        risk: percentage > 50 ? 'high' : percentage > 30 ? 'medium' : 'low',
      };
    });
  }, [selectedCompanyData]);

  // Overall risk gauge data
  const overallRiskScore = useMemo(() => {
    if (!riskScoreData.length) return 0;
    return riskScoreData.reduce((sum, risk) => sum + risk.value, 0) / riskScoreData.length;
  }, [riskScoreData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;

    return (
      <div className="bg-[color:var(--terminal-bg)] border border-[color:var(--terminal-border)] p-3 rounded shadow-lg">
        <p className="text-[color:var(--terminal-accent)] font-bold text-sm mb-1">{label}</p>
        <div className="space-y-1 text-xs">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-3">
              <span className="text-[color:var(--terminal-text-secondary)]">{entry.name}:</span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                {typeof entry.value === 'number' ? 
                  entry.name.includes('Beta') ? entry.value.toFixed(2) : formatPercentage(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'scorecard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Radar */}
            <div>
              <h4 className="text-sm font-medium text-[color:var(--terminal-text-secondary)] mb-2">
                Risk Profile Radar
              </h4>
              <ResponsiveContainer width="100%" height={height / 2}>
                <RadarChart data={riskScoreData}>
                  <PolarGrid stroke="var(--terminal-border)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--terminal-text-secondary)" tick={{ fontSize: 10 }} />
                  <Radar
                    name="Risk Score"
                    dataKey="value"
                    stroke={getRiskColor(overallRiskScore)}
                    fill={getRiskColor(overallRiskScore)}
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Gauge */}
            <div>
              <h4 className="text-sm font-medium text-[color:var(--terminal-text-secondary)] mb-2">
                Overall Risk Score
              </h4>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: overallRiskScore, fill: getRiskColor(overallRiskScore) },
                          { value: 100 - overallRiskScore, fill: 'var(--terminal-bg-dark)' },
                        ]}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {[0, 1].map((entry, index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: getRiskColor(overallRiskScore) }}>
                      {overallRiskScore.toFixed(0)}
                    </span>
                    <span className="text-xs text-[color:var(--terminal-text-secondary)]">Risk Score</span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium" style={{ color: getRiskColor(overallRiskScore) }}>
                    {overallRiskScore < 30 ? 'Low Risk' :
                     overallRiskScore < 60 ? 'Medium Risk' :
                     overallRiskScore < 80 ? 'High Risk' : 'Critical Risk'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'var':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={varData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis dataKey="date" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="var99"
                stroke="var(--terminal-error)"
                fill="var(--terminal-error)"
                fillOpacity={0.3}
                name="VaR 99%"
              />
              <Area
                type="monotone"
                dataKey="var95"
                stroke="var(--terminal-warning)"
                fill="var(--terminal-warning)"
                fillOpacity={0.3}
                name="VaR 95%"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--terminal-accent)"
                strokeWidth={2}
                dot={false}
                name="Actual Loss/Gain"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'beta':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={betaData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-border)" opacity={0.3} />
              <XAxis dataKey="ticker" stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--terminal-text-secondary)" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="stockBeta" fill="var(--terminal-accent)" name="Stock Beta" />
              <Bar dataKey="cryptoBeta" fill="var(--terminal-success)" name="Crypto Beta" />
              <Line
                type="monotone"
                dataKey="combinedBeta"
                stroke="var(--terminal-warning)"
                strokeWidth={2}
                name="Combined Beta"
              />
              <Line
                type="monotone"
                dataKey={() => 1}
                stroke="var(--terminal-text-muted)"
                strokeDasharray="5 5"
                name="Market (1.0)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'concentration':
        return (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={height * 0.6}>
              <PieChart>
                <Pie
                  data={concentrationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {concentrationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk as keyof typeof RISK_COLORS]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Concentration Risk Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">Herfindahl Index</p>
                <p className="text-lg font-mono text-[color:var(--terminal-warning)]">
                  {(concentrationData.reduce((sum, d) => sum + Math.pow(d.value / 100, 2), 0) * 10000).toFixed(0)}
                </p>
              </div>
              <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">Top Asset %</p>
                <p className="text-lg font-mono text-[color:var(--terminal-accent)]">
                  {formatPercentage(Math.max(...concentrationData.map(d => d.value)))}
                </p>
              </div>
              <div className="p-2 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">Risk Level</p>
                <p className="text-lg font-mono" style={{
                  color: Math.max(...concentrationData.map(d => d.value)) > 50 ? RISK_COLORS.high : RISK_COLORS.medium
                }}>
                  {Math.max(...concentrationData.map(d => d.value)) > 50 ? 'High' : 'Medium'}
                </p>
              </div>
            </div>
          </div>
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
            <Shield className="w-5 h-5" />
            Risk Analysis Dashboard
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex gap-1 bg-[color:var(--terminal-bg-dark)] p-1 rounded">
              {[
                { type: 'scorecard' as ChartType, label: 'Risk Score', icon: AlertTriangle },
                { type: 'var' as ChartType, label: 'VaR', icon: TrendingDown },
                { type: 'beta' as ChartType, label: 'Beta', icon: Activity },
                { type: 'concentration' as ChartType, label: 'Concentration', icon: Shield },
              ].map(({ type, label, icon: Icon }) => (
                <TerminalButton
                  key={type}
                  size="sm"
                  variant={chartType === type ? 'primary' : 'ghost'}
                  onClick={() => setChartType(type)}
                  className="px-2 py-1 text-xs flex items-center gap-1"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </TerminalButton>
              ))}
            </div>
          </div>
        </div>

        {/* Company Selector */}
        {(chartType === 'scorecard' || chartType === 'concentration') && (
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
      </div>
    </TerminalCard>
  );
}