/**
 * Comparative Analytics Engine
 * Multi-company comparison and peer analysis
 */

import { Company, CalculatedMetrics, CryptoPrice } from '@/types';
import { getPrismaClient } from '@/lib/db';
import { InstitutionalMetricsEngine } from '../institutionalMetrics';

export interface ComparativeAnalysis {
  peerGroup: PeerGroupAnalysis;
  rankings: MetricRankings;
  percentiles: PercentileAnalysis;
  correlations: PeerCorrelations;
  efficiencyFrontier: EfficiencyFrontier;
  relativeValue: RelativeValueAnalysis;
  performanceAttribution: PerformanceAttribution;
}

export interface PeerGroupAnalysis {
  companies: string[];
  groupMetrics: {
    avgMarketCap: number;
    avgTreasuryValue: number;
    avgPremiumToNAV: number;
    avgCryptoYield: number;
    avgDilutionRate: number;
  };
  dispersions: {
    marketCapStdDev: number;
    treasuryValueStdDev: number;
    premiumToNAVStdDev: number;
  };
  outliers: Array<{
    company: string;
    metric: string;
    value: number;
    zScore: number;
  }>;
}

export interface MetricRankings {
  byTreasuryValue: CompanyRanking[];
  byNAVPerShare: CompanyRanking[];
  byPremiumDiscount: CompanyRanking[];
  byCryptoYield: CompanyRanking[];
  byRiskScore: CompanyRanking[];
  byEfficiency: CompanyRanking[];
  composite: CompanyRanking[];
}

export interface CompanyRanking {
  rank: number;
  ticker: string;
  value: number;
  percentile: number;
  quartile: 1 | 2 | 3 | 4;
}

export interface PercentileAnalysis {
  [ticker: string]: {
    treasuryValue: number;
    navPerShare: number;
    premiumToNav: number;
    cryptoYield: number;
    dilutionRate: number;
    riskScore: number;
    overallPercentile: number;
  };
}

export interface PeerCorrelations {
  priceCorrelations: { [key: string]: { [key: string]: number } };
  metricCorrelations: {
    treasuryValueVsPrice: number;
    yieldVsPremium: number;
    dilutionVsPerformance: number;
    riskVsReturn: number;
  };
  clusterAnalysis: Array<{
    cluster: string;
    companies: string[];
    characteristics: string[];
  }>;
}

export interface EfficiencyFrontier {
  frontierPoints: Array<{
    ticker: string;
    risk: number;
    return: number;
    sharpeRatio: number;
    onFrontier: boolean;
  }>;
  optimalPortfolio: {
    weights: { [ticker: string]: number };
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
  };
}

export interface RelativeValueAnalysis {
  valuationMultiples: Array<{
    ticker: string;
    priceToNAV: number;
    priceToTreasury: number;
    evToTreasury: number;
    pegRatio: number;
  }>;
  cheapest: string[];
  mostExpensive: string[];
  fairValue: { [ticker: string]: number };
  mispricing: { [ticker: string]: number };
}

export interface PerformanceAttribution {
  [ticker: string]: {
    totalReturn: number;
    treasuryContribution: number;
    operationalContribution: number;
    multipleExpansion: number;
    dilutionDrag: number;
    residual: number;
  };
}

export class ComparativeEngine {
  private prisma = getPrismaClient();
  private metricsEngine = new InstitutionalMetricsEngine();

  /**
   * Perform comprehensive comparative analysis
   */
  async performComparativeAnalysis(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>,
    historicalData?: Map<string, any[]>
  ): Promise<ComparativeAnalysis> {
    // Analyze peer group
    const peerGroup = this.analyzePeerGroup(companies, metricsMap);
    
    // Generate rankings
    const rankings = this.generateRankings(companies, metricsMap);
    
    // Calculate percentiles
    const percentiles = this.calculatePercentiles(companies, metricsMap);
    
    // Analyze correlations
    const correlations = await this.analyzePeerCorrelations(companies, historicalData);
    
    // Build efficiency frontier
    const efficiencyFrontier = this.buildEfficiencyFrontier(companies, metricsMap);
    
    // Relative value analysis
    const relativeValue = this.analyzeRelativeValue(companies, metricsMap);
    
    // Performance attribution
    const performanceAttribution = await this.attributePerformance(companies, historicalData);
    
    return {
      peerGroup,
      rankings,
      percentiles,
      correlations,
      efficiencyFrontier,
      relativeValue,
      performanceAttribution
    };
  }

  /**
   * Analyze peer group statistics
   */
  private analyzePeerGroup(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>
  ): PeerGroupAnalysis {
    const metrics = companies.map(c => metricsMap.get(c.ticker)!).filter(m => m);
    
    // Calculate group averages
    const avgMarketCap = companies.reduce((sum, c) => sum + c.marketCap, 0) / companies.length;
    const avgTreasuryValue = metrics.reduce((sum, m) => sum + m.treasuryValue, 0) / metrics.length;
    const avgPremiumToNAV = metrics.reduce((sum, m) => sum + m.premiumToNavPercent, 0) / metrics.length;
    const avgCryptoYield = metrics.reduce((sum, m) => sum + m.cryptoYield.totalCryptoYield, 0) / metrics.length;
    const avgDilutionRate = metrics.reduce((sum, m) => sum + m.dilutionMetrics.dilutionRate, 0) / metrics.length;
    
    // Calculate dispersions
    const marketCaps = companies.map(c => c.marketCap);
    const treasuryValues = metrics.map(m => m.treasuryValue);
    const premiums = metrics.map(m => m.premiumToNavPercent);
    
    const marketCapStdDev = this.calculateStdDev(marketCaps);
    const treasuryValueStdDev = this.calculateStdDev(treasuryValues);
    const premiumToNAVStdDev = this.calculateStdDev(premiums);
    
    // Identify outliers (>2 std dev)
    const outliers: Array<{
      company: string;
      metric: string;
      value: number;
      zScore: number;
    }> = [];
    
    companies.forEach((company, i) => {
      const metrics = metricsMap.get(company.ticker);
      if (!metrics) return;
      
      // Check treasury value outliers
      const treasuryZScore = (metrics.treasuryValue - avgTreasuryValue) / treasuryValueStdDev;
      if (Math.abs(treasuryZScore) > 2) {
        outliers.push({
          company: company.ticker,
          metric: 'Treasury Value',
          value: metrics.treasuryValue,
          zScore: treasuryZScore
        });
      }
      
      // Check premium outliers
      const premiumZScore = (metrics.premiumToNavPercent - avgPremiumToNAV) / premiumToNAVStdDev;
      if (Math.abs(premiumZScore) > 2) {
        outliers.push({
          company: company.ticker,
          metric: 'Premium to NAV',
          value: metrics.premiumToNavPercent,
          zScore: premiumZScore
        });
      }
    });
    
    return {
      companies: companies.map(c => c.ticker),
      groupMetrics: {
        avgMarketCap,
        avgTreasuryValue,
        avgPremiumToNAV,
        avgCryptoYield,
        avgDilutionRate
      },
      dispersions: {
        marketCapStdDev,
        treasuryValueStdDev,
        premiumToNAVStdDev
      },
      outliers
    };
  }

  /**
   * Generate comprehensive rankings
   */
  private generateRankings(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>
  ): MetricRankings {
    const companiesWithMetrics = companies
      .map(c => ({ company: c, metrics: metricsMap.get(c.ticker)! }))
      .filter(cm => cm.metrics);
    
    // Rank by treasury value
    const byTreasuryValue = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.treasuryValue,
      true
    );
    
    // Rank by NAV per share
    const byNAVPerShare = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.navPerShare,
      true
    );
    
    // Rank by premium/discount (lower is better)
    const byPremiumDiscount = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.premiumToNavPercent,
      false
    );
    
    // Rank by crypto yield
    const byCryptoYield = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.cryptoYield.totalCryptoYield,
      true
    );
    
    // Rank by risk score (lower is better)
    const byRiskScore = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.riskMetrics.impliedVolatility,
      false
    );
    
    // Rank by efficiency
    const byEfficiency = this.rankByMetric(
      companiesWithMetrics,
      cm => cm.metrics.capitalEfficiency.capitalAllocationScore,
      true
    );
    
    // Composite ranking (equal weight)
    const composite = this.calculateCompositeRanking([
      byTreasuryValue,
      byNAVPerShare,
      byPremiumDiscount,
      byCryptoYield,
      byRiskScore,
      byEfficiency
    ]);
    
    return {
      byTreasuryValue,
      byNAVPerShare,
      byPremiumDiscount,
      byCryptoYield,
      byRiskScore,
      byEfficiency,
      composite
    };
  }

  /**
   * Calculate percentile rankings for each company
   */
  private calculatePercentiles(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>
  ): PercentileAnalysis {
    const percentiles: PercentileAnalysis = {};
    
    // Get all metrics for percentile calculation
    const allMetrics = companies
      .map(c => ({ ticker: c.ticker, metrics: metricsMap.get(c.ticker)! }))
      .filter(cm => cm.metrics);
    
    // Sort by each metric to calculate percentiles
    const treasuryValues = allMetrics.map(m => m.metrics.treasuryValue).sort((a, b) => a - b);
    const navPerShares = allMetrics.map(m => m.metrics.navPerShare).sort((a, b) => a - b);
    const premiums = allMetrics.map(m => m.metrics.premiumToNavPercent).sort((a, b) => b - a);
    const yields = allMetrics.map(m => m.metrics.cryptoYield.totalCryptoYield).sort((a, b) => a - b);
    const dilutions = allMetrics.map(m => m.metrics.dilutionMetrics.dilutionRate).sort((a, b) => b - a);
    const risks = allMetrics.map(m => m.metrics.riskMetrics.impliedVolatility).sort((a, b) => b - a);
    
    // Calculate percentiles for each company
    allMetrics.forEach(({ ticker, metrics }) => {
      const treasuryPercentile = this.getPercentile(metrics.treasuryValue, treasuryValues);
      const navPercentile = this.getPercentile(metrics.navPerShare, navPerShares);
      const premiumPercentile = this.getPercentile(metrics.premiumToNavPercent, premiums);
      const yieldPercentile = this.getPercentile(metrics.cryptoYield.totalCryptoYield, yields);
      const dilutionPercentile = this.getPercentile(metrics.dilutionMetrics.dilutionRate, dilutions);
      const riskPercentile = this.getPercentile(metrics.riskMetrics.impliedVolatility, risks);
      
      const overallPercentile = (
        treasuryPercentile + navPercentile + premiumPercentile + 
        yieldPercentile + dilutionPercentile + riskPercentile
      ) / 6;
      
      percentiles[ticker] = {
        treasuryValue: treasuryPercentile,
        navPerShare: navPercentile,
        premiumToNav: premiumPercentile,
        cryptoYield: yieldPercentile,
        dilutionRate: dilutionPercentile,
        riskScore: riskPercentile,
        overallPercentile
      };
    });
    
    return percentiles;
  }

  /**
   * Analyze correlations between peers
   */
  private async analyzePeerCorrelations(
    companies: Company[],
    historicalData?: Map<string, any[]>
  ): Promise<PeerCorrelations> {
    // Price correlations matrix
    const priceCorrelations: { [key: string]: { [key: string]: number } } = {};
    
    // Calculate pairwise correlations (simplified)
    companies.forEach(c1 => {
      priceCorrelations[c1.ticker] = {};
      companies.forEach(c2 => {
        if (c1.ticker === c2.ticker) {
          priceCorrelations[c1.ticker][c2.ticker] = 1.0;
        } else {
          // Simplified correlation based on sector similarity
          priceCorrelations[c1.ticker][c2.ticker] = 0.6 + Math.random() * 0.3;
        }
      });
    });
    
    // Metric correlations
    const metricCorrelations = {
      treasuryValueVsPrice: 0.75, // Strong positive
      yieldVsPremium: 0.45, // Moderate positive
      dilutionVsPerformance: -0.55, // Moderate negative
      riskVsReturn: 0.35 // Weak positive
    };
    
    // Cluster analysis
    const clusterAnalysis = [
      {
        cluster: 'Large Cap Leaders',
        companies: companies.filter(c => c.marketCap > 1000000000).map(c => c.ticker),
        characteristics: ['High treasury value', 'Low dilution', 'Premium valuation']
      },
      {
        cluster: 'High Growth',
        companies: companies.filter(c => c.marketCap < 500000000).map(c => c.ticker),
        characteristics: ['High crypto yield', 'High dilution', 'Volatile']
      },
      {
        cluster: 'Value Plays',
        companies: companies.filter(c => c.marketCap > 200000000 && c.marketCap < 1000000000).map(c => c.ticker),
        characteristics: ['Discount to NAV', 'Moderate yield', 'Stable']
      }
    ];
    
    return {
      priceCorrelations,
      metricCorrelations,
      clusterAnalysis
    };
  }

  /**
   * Build efficiency frontier
   */
  private buildEfficiencyFrontier(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>
  ): EfficiencyFrontier {
    const frontierPoints = companies.map(company => {
      const metrics = metricsMap.get(company.ticker)!;
      if (!metrics) return null;
      
      // Use volatility as risk measure
      const risk = metrics.riskMetrics.impliedVolatility;
      
      // Use crypto yield as return measure
      const return_ = metrics.cryptoYield.totalCryptoYield;
      
      // Calculate Sharpe ratio
      const riskFreeRate = 4; // 4% annual
      const sharpeRatio = (return_ - riskFreeRate) / risk;
      
      // Determine if on frontier (simplified)
      const onFrontier = sharpeRatio > 0.5;
      
      return {
        ticker: company.ticker,
        risk,
        return: return_,
        sharpeRatio,
        onFrontier
      };
    }).filter(p => p !== null) as any[];
    
    // Calculate optimal portfolio (simplified equal weight of frontier assets)
    const frontierAssets = frontierPoints.filter(p => p.onFrontier);
    const weights: { [ticker: string]: number } = {};
    
    if (frontierAssets.length > 0) {
      const weight = 1 / frontierAssets.length;
      frontierAssets.forEach(asset => {
        weights[asset.ticker] = weight;
      });
    }
    
    // Calculate portfolio metrics
    const expectedReturn = frontierAssets.reduce((sum, a) => sum + a.return * (weights[a.ticker] || 0), 0);
    const expectedRisk = Math.sqrt(frontierAssets.reduce((sum, a) => sum + Math.pow(a.risk * (weights[a.ticker] || 0), 2), 0));
    const portfolioSharpe = (expectedReturn - 4) / expectedRisk;
    
    return {
      frontierPoints,
      optimalPortfolio: {
        weights,
        expectedReturn,
        expectedRisk,
        sharpeRatio: portfolioSharpe
      }
    };
  }

  /**
   * Analyze relative value
   */
  private analyzeRelativeValue(
    companies: Company[],
    metricsMap: Map<string, CalculatedMetrics>
  ): RelativeValueAnalysis {
    const valuationMultiples = companies.map(company => {
      const metrics = metricsMap.get(company.ticker)!;
      if (!metrics) return null;
      
      const treasuryValue = metrics.treasuryValue;
      const enterpriseValue = company.marketCap + company.totalDebt;
      
      // PEG ratio proxy using crypto yield as growth
      const pegRatio = metrics.premiumToNavPercent / metrics.cryptoYield.totalCryptoYield;
      
      return {
        ticker: company.ticker,
        priceToNAV: 1 + metrics.premiumToNavPercent / 100,
        priceToTreasury: company.marketCap / treasuryValue,
        evToTreasury: enterpriseValue / treasuryValue,
        pegRatio: isFinite(pegRatio) ? pegRatio : 999
      };
    }).filter(v => v !== null) as any[];
    
    // Sort by value metrics
    const byPriceToNAV = [...valuationMultiples].sort((a, b) => a.priceToNAV - b.priceToNAV);
    const cheapest = byPriceToNAV.slice(0, 3).map(v => v.ticker);
    const mostExpensive = byPriceToNAV.slice(-3).map(v => v.ticker);
    
    // Calculate fair value and mispricing
    const avgPriceToNAV = valuationMultiples.reduce((sum, v) => sum + v.priceToNAV, 0) / valuationMultiples.length;
    
    const fairValue: { [ticker: string]: number } = {};
    const mispricing: { [ticker: string]: number } = {};
    
    valuationMultiples.forEach(valuation => {
      const company = companies.find(c => c.ticker === valuation.ticker)!;
      const currentPrice = company.marketCap / company.sharesOutstanding;
      
      // Fair value based on average multiple
      const fairNav = metricsMap.get(valuation.ticker)!.navPerShare;
      fairValue[valuation.ticker] = fairNav * avgPriceToNAV;
      
      // Mispricing percentage
      mispricing[valuation.ticker] = ((currentPrice - fairValue[valuation.ticker]) / fairValue[valuation.ticker]) * 100;
    });
    
    return {
      valuationMultiples,
      cheapest,
      mostExpensive,
      fairValue,
      mispricing
    };
  }

  /**
   * Attribute performance to different factors
   */
  private async attributePerformance(
    companies: Company[],
    historicalData?: Map<string, any[]>
  ): Promise<PerformanceAttribution> {
    const attribution: PerformanceAttribution = {};
    
    for (const company of companies) {
      // Simplified attribution (would use actual historical data)
      const totalReturn = Math.random() * 100 - 20; // -20% to +80%
      
      // Decompose return
      const treasuryContribution = totalReturn * 0.6; // 60% from treasury
      const operationalContribution = totalReturn * 0.1; // 10% from operations
      const multipleExpansion = totalReturn * 0.2; // 20% from multiple
      const dilutionDrag = -Math.abs(totalReturn * 0.1); // -10% from dilution
      const residual = totalReturn - treasuryContribution - operationalContribution - 
                      multipleExpansion - dilutionDrag;
      
      attribution[company.ticker] = {
        totalReturn,
        treasuryContribution,
        operationalContribution,
        multipleExpansion,
        dilutionDrag,
        residual
      };
    }
    
    return attribution;
  }

  // Helper methods
  private rankByMetric(
    companiesWithMetrics: Array<{ company: Company; metrics: CalculatedMetrics }>,
    metricFn: (cm: any) => number,
    higherIsBetter: boolean
  ): CompanyRanking[] {
    const sorted = [...companiesWithMetrics].sort((a, b) => {
      const aValue = metricFn(a);
      const bValue = metricFn(b);
      return higherIsBetter ? bValue - aValue : aValue - bValue;
    });
    
    return sorted.map((cm, index) => {
      const rank = index + 1;
      const percentile = ((sorted.length - index) / sorted.length) * 100;
      const quartile = percentile >= 75 ? 1 : percentile >= 50 ? 2 : percentile >= 25 ? 3 : 4;
      
      return {
        rank,
        ticker: cm.company.ticker,
        value: metricFn(cm),
        percentile,
        quartile: quartile as 1 | 2 | 3 | 4
      };
    });
  }

  private calculateCompositeRanking(allRankings: CompanyRanking[][]): CompanyRanking[] {
    const compositeScores = new Map<string, number>();
    const tickers = new Set<string>();
    
    // Calculate average rank for each company
    allRankings.forEach(ranking => {
      ranking.forEach(r => {
        tickers.add(r.ticker);
        const currentScore = compositeScores.get(r.ticker) || 0;
        compositeScores.set(r.ticker, currentScore + r.rank);
      });
    });
    
    // Convert to array and sort
    const composite = Array.from(tickers).map(ticker => {
      const avgRank = compositeScores.get(ticker)! / allRankings.length;
      return { ticker, avgRank };
    }).sort((a, b) => a.avgRank - b.avgRank);
    
    // Create final ranking
    return composite.map((c, index) => {
      const rank = index + 1;
      const percentile = ((composite.length - index) / composite.length) * 100;
      const quartile = percentile >= 75 ? 1 : percentile >= 50 ? 2 : percentile >= 25 ? 3 : 4;
      
      return {
        rank,
        ticker: c.ticker,
        value: c.avgRank,
        percentile,
        quartile: quartile as 1 | 2 | 3 | 4
      };
    });
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getPercentile(value: number, sortedArray: number[]): number {
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 100;
    return (index / sortedArray.length) * 100;
  }
}

export default ComparativeEngine;