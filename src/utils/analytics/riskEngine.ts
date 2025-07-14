/**
 * Risk Assessment Metrics Engine
 * Institutional-grade risk analysis for DAT companies
 */

import { Company, HistoricalDataPoint, CryptoPrice } from '@/types';
import { getPrismaClient } from '@/lib/db';

export interface ComprehensiveRiskMetrics {
  marketRisk: MarketRiskMetrics;
  concentrationRisk: ConcentrationRiskAnalysis;
  liquidityRisk: LiquidityRiskMetrics;
  creditRisk: CreditRiskAssessment;
  operationalRisk: OperationalRiskMetrics;
  correlationAnalysis: CorrelationMetrics;
  varAnalysis: ValueAtRiskAnalysis;
  stressTest: StressTestResults;
  riskScore: RiskScorecard;
}

export interface MarketRiskMetrics {
  beta: {
    vsSPY: number;
    vsBTC: number;
    vsETH: number;
    vsSOL: number;
  };
  volatility: {
    daily: number;
    weekly: number;
    monthly: number;
    annualized: number;
    impliedVolatility?: number;
  };
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: {
    value: number;
    startDate: Date;
    endDate: Date;
    duration: number;
    recovery?: Date;
  };
  downsideDeviation: number;
  uptimeRatio: number;
}

export interface ConcentrationRiskAnalysis {
  treasuryConcentration: {
    herfindahlIndex: number;
    topHoldingPercent: number;
    diversificationRatio: number;
    concentrationCategory: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  singleAssetRisk: Array<{
    asset: string;
    percentOfTreasury: number;
    percentOfMarketCap: number;
    liquidationRisk: number;
  }>;
  correlationRisk: number;
  clusterRisk: {
    cryptoCluster: number;
    defiCluster: number;
    layer1Cluster: number;
  };
}

export interface LiquidityRiskMetrics {
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  treasuryLiquidityScore: number;
  debtMaturityProfile: Array<{
    year: number;
    amount: number;
    percentOfTreasury: number;
  }>;
  runwayMonths: number;
  stressedRunway: number;
  liquidationAnalysis: {
    daysToLiquidate25Percent: number;
    daysToLiquidate50Percent: number;
    marketImpact: number;
  };
}

export interface CreditRiskAssessment {
  debtToEquity: number;
  debtToTreasury: number;
  interestCoverage: number;
  debtServiceCoverage: number;
  altmanZScore: number;
  creditRating: string;
  defaultProbability: number;
  recoveryRate: number;
  creditSpread: number;
}

export interface OperationalRiskMetrics {
  businessModelRisk: number;
  revenueConcentration: number;
  customerConcentration: number;
  keyPersonRisk: number;
  regulatoryRisk: number;
  cybersecurityRisk: number;
  operationalLeverage: number;
  scalabilityScore: number;
}

export interface CorrelationMetrics {
  assetCorrelations: {
    [key: string]: {
      [key: string]: number;
    };
  };
  sectorCorrelation: number;
  marketCorrelation: number;
  correlationStability: number;
  regimeAnalysis: {
    currentRegime: 'Risk-On' | 'Risk-Off' | 'Neutral';
    regimeProbabilities: {
      riskOn: number;
      riskOff: number;
      neutral: number;
    };
  };
}

export interface ValueAtRiskAnalysis {
  var95: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  var99: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  cvar95: number;
  cvar99: number;
  expectedShortfall: number;
  tailRisk: number;
  methodology: 'Historical' | 'Parametric' | 'MonteCarlo';
}

export interface StressTestResults {
  scenarios: Array<{
    name: string;
    probability: number;
    treasuryImpact: number;
    navImpact: number;
    liquidityImpact: number;
    solvencyImpact: number;
    overallImpact: 'Low' | 'Medium' | 'High' | 'Severe';
  }>;
  breakingPoint: {
    treasuryDeclinePercent: number;
    description: string;
  };
  recoveryTime: number;
}

export interface RiskScorecard {
  overallScore: number;
  category: 'Low' | 'Medium' | 'High' | 'Critical';
  breakdown: {
    marketRisk: number;
    concentrationRisk: number;
    liquidityRisk: number;
    creditRisk: number;
    operationalRisk: number;
  };
  peerPercentile: number;
  trend: 'Improving' | 'Stable' | 'Deteriorating';
  keyRisks: string[];
  mitigationRecommendations: string[];
}

export class RiskEngine {
  private prisma = getPrismaClient();

  /**
   * Calculate comprehensive risk metrics
   */
  async calculateRiskMetrics(
    company: Company,
    historicalData: HistoricalDataPoint[],
    cryptoPrices: CryptoPrice[],
    marketData?: any
  ): Promise<ComprehensiveRiskMetrics> {
    // Calculate individual risk components
    const marketRisk = await this.calculateMarketRisk(company, historicalData, marketData);
    const concentrationRisk = this.calculateConcentrationRisk(company);
    const liquidityRisk = this.calculateLiquidityRisk(company);
    const creditRisk = this.calculateCreditRisk(company);
    const operationalRisk = this.calculateOperationalRisk(company);
    const correlationAnalysis = await this.calculateCorrelations(company, historicalData);
    const varAnalysis = this.calculateValueAtRisk(historicalData);
    const stressTest = this.performStressTests(company, cryptoPrices);
    
    // Generate overall risk score
    const riskScore = this.generateRiskScorecard(
      marketRisk,
      concentrationRisk,
      liquidityRisk,
      creditRisk,
      operationalRisk
    );
    
    return {
      marketRisk,
      concentrationRisk,
      liquidityRisk,
      creditRisk,
      operationalRisk,
      correlationAnalysis,
      varAnalysis,
      stressTest,
      riskScore
    };
  }

  /**
   * Calculate market risk metrics
   */
  private async calculateMarketRisk(
    company: Company,
    historicalData: HistoricalDataPoint[],
    marketData?: any
  ): Promise<MarketRiskMetrics> {
    // Calculate returns
    const returns = this.calculateReturns(historicalData);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(returns);
    
    // Calculate beta (simplified - would need market data)
    const beta = {
      vsSPY: volatility.annualized / 20, // Assume SPY vol of 20%
      vsBTC: volatility.annualized / 80, // Assume BTC vol of 80%
      vsETH: volatility.annualized / 90, // Assume ETH vol of 90%
      vsSOL: volatility.annualized / 100 // Assume SOL vol of 100%
    };
    
    // Calculate risk-adjusted returns
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const riskFreeRate = 0.04 / 252; // 4% annual, daily
    const excessReturn = avgReturn - riskFreeRate;
    
    const sharpeRatio = excessReturn / (volatility.daily / 100) * Math.sqrt(252);
    
    // Sortino ratio (downside deviation)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    ) * 100;
    const sortinoRatio = excessReturn / (downsideDeviation / 100) * Math.sqrt(252);
    
    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(historicalData);
    
    // Uptime ratio (% of positive days)
    const uptimeRatio = returns.filter(r => r > 0).length / returns.length;
    
    return {
      beta,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      downsideDeviation,
      uptimeRatio
    };
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(company: Company): ConcentrationRiskAnalysis {
    const holdings = company.treasury;
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    // Herfindahl Index (sum of squared market shares)
    const herfindahlIndex = holdings.reduce((sum, h) => {
      const share = h.currentValue / totalValue;
      return sum + share * share;
    }, 0);
    
    // Top holding concentration
    const topHoldingPercent = Math.max(...holdings.map(h => h.currentValue / totalValue)) * 100;
    
    // Diversification ratio
    const equalWeight = 1 / holdings.length;
    const diversificationRatio = (1 / herfindahlIndex) / holdings.length;
    
    // Determine concentration category
    let concentrationCategory: 'Low' | 'Medium' | 'High' | 'Critical';
    if (herfindahlIndex > 0.5) concentrationCategory = 'Critical';
    else if (herfindahlIndex > 0.35) concentrationCategory = 'High';
    else if (herfindahlIndex > 0.2) concentrationCategory = 'Medium';
    else concentrationCategory = 'Low';
    
    // Single asset risk analysis
    const singleAssetRisk = holdings.map(h => ({
      asset: h.crypto,
      percentOfTreasury: (h.currentValue / totalValue) * 100,
      percentOfMarketCap: (h.currentValue / company.marketCap) * 100,
      liquidationRisk: this.calculateLiquidationRisk(h.crypto, h.amount)
    }));
    
    // Correlation risk (simplified)
    const correlationRisk = 0.7; // Assume high correlation among cryptos
    
    // Cluster risk
    const clusterRisk = {
      cryptoCluster: 100, // All holdings are crypto
      defiCluster: holdings.filter(h => ['ETH', 'SOL'].includes(h.crypto)).length / holdings.length * 100,
      layer1Cluster: 100 // All are L1s
    };
    
    return {
      treasuryConcentration: {
        herfindahlIndex,
        topHoldingPercent,
        diversificationRatio,
        concentrationCategory
      },
      singleAssetRisk,
      correlationRisk,
      clusterRisk
    };
  }

  /**
   * Calculate liquidity risk metrics
   */
  private calculateLiquidityRisk(company: Company): LiquidityRiskMetrics {
    const treasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    const currentAssets = treasuryValue + company.businessModel.operatingRevenue * 0.25; // Estimate
    const currentLiabilities = company.totalDebt * 0.3; // Estimate current portion
    
    // Liquidity ratios
    const currentRatio = currentAssets / currentLiabilities;
    const quickRatio = treasuryValue / currentLiabilities;
    const cashRatio = treasuryValue * 0.9 / currentLiabilities; // Assume 90% liquid
    
    // Treasury liquidity score (0-100)
    const treasuryLiquidityScore = this.calculateTreasuryLiquidityScore(company.treasury);
    
    // Debt maturity profile
    const debtMaturityProfile = this.generateDebtMaturityProfile(company);
    
    // Runway calculation
    const monthlyBurn = Math.abs(company.businessModel.cashBurnRate);
    const runwayMonths = monthlyBurn > 0 ? treasuryValue / monthlyBurn : 999;
    const stressedRunway = monthlyBurn > 0 ? treasuryValue * 0.5 / (monthlyBurn * 1.5) : 999;
    
    // Liquidation analysis
    const liquidationAnalysis = {
      daysToLiquidate25Percent: this.estimateLiquidationTime(company.treasury, 0.25),
      daysToLiquidate50Percent: this.estimateLiquidationTime(company.treasury, 0.50),
      marketImpact: this.estimateMarketImpact(company.treasury)
    };
    
    return {
      currentRatio,
      quickRatio,
      cashRatio,
      treasuryLiquidityScore,
      debtMaturityProfile,
      runwayMonths,
      stressedRunway,
      liquidationAnalysis
    };
  }

  /**
   * Calculate credit risk assessment
   */
  private calculateCreditRisk(company: Company): CreditRiskAssessment {
    const treasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    const operatingIncome = company.businessModel.operatingRevenue - company.businessModel.operatingExpenses;
    
    // Basic ratios
    const debtToEquity = company.totalDebt / company.shareholdersEquity;
    const debtToTreasury = company.totalDebt / treasuryValue;
    
    // Coverage ratios
    const annualInterest = company.totalDebt * 0.05; // Assume 5% average rate
    const interestCoverage = operatingIncome / annualInterest;
    const debtServiceCoverage = (operatingIncome + treasuryValue * 0.1) / annualInterest;
    
    // Altman Z-Score (modified for DAT companies)
    const workingCapital = treasuryValue - company.totalDebt * 0.3;
    const totalAssets = treasuryValue + company.shareholdersEquity;
    const retainedEarnings = company.shareholdersEquity * 0.5; // Estimate
    const ebit = operatingIncome;
    const sales = company.businessModel.operatingRevenue;
    
    const altmanZScore = 1.2 * (workingCapital / totalAssets) +
                        1.4 * (retainedEarnings / totalAssets) +
                        3.3 * (ebit / totalAssets) +
                        0.6 * (company.marketCap / company.totalDebt) +
                        1.0 * (sales / totalAssets);
    
    // Credit rating estimation
    let creditRating: string;
    if (altmanZScore > 3) creditRating = 'BBB';
    else if (altmanZScore > 2.6) creditRating = 'BB';
    else if (altmanZScore > 1.8) creditRating = 'B';
    else creditRating = 'CCC';
    
    // Default probability (simplified Merton model)
    const defaultProbability = Math.max(0, Math.min(1, 1 / (1 + Math.exp(altmanZScore - 1.8))));
    
    // Recovery rate estimation
    const recoveryRate = Math.min(0.8, treasuryValue / company.totalDebt);
    
    // Credit spread estimation (basis points)
    const creditSpread = defaultProbability * 10000 * (1 - recoveryRate);
    
    return {
      debtToEquity,
      debtToTreasury,
      interestCoverage,
      debtServiceCoverage,
      altmanZScore,
      creditRating,
      defaultProbability,
      recoveryRate,
      creditSpread
    };
  }

  /**
   * Calculate operational risk metrics
   */
  private calculateOperationalRisk(company: Company): OperationalRiskMetrics {
    // Business model risk (0-100)
    const isTreasuryFocused = company.businessModel.isTreasuryFocused;
    const businessModelRisk = isTreasuryFocused ? 60 : 40;
    
    // Revenue concentration
    const revenueStreams = company.businessModel.revenueStreams.length;
    const revenueConcentration = revenueStreams > 0 ? 100 / revenueStreams : 100;
    
    // Customer concentration (estimated)
    const customerConcentration = 50; // Default medium concentration
    
    // Key person risk
    const keyPersonRisk = company.governance.ceoFounder ? 70 : 40;
    
    // Regulatory risk
    const regulatoryRisk = 60; // Medium risk for all crypto companies
    
    // Cybersecurity risk
    const cybersecurityRisk = 50; // Default medium risk
    
    // Operational leverage
    const operatingRevenue = company.businessModel.operatingRevenue;
    const operatingExpenses = company.businessModel.operatingExpenses;
    const operationalLeverage = operatingRevenue > 0 ? 
      (operatingRevenue - operatingExpenses) / operatingRevenue * 100 : -100;
    
    // Scalability score
    const scalabilityScore = isTreasuryFocused ? 80 : 50;
    
    return {
      businessModelRisk,
      revenueConcentration,
      customerConcentration,
      keyPersonRisk,
      regulatoryRisk,
      cybersecurityRisk,
      operationalLeverage,
      scalabilityScore
    };
  }

  /**
   * Calculate correlation metrics
   */
  private async calculateCorrelations(
    company: Company,
    historicalData: HistoricalDataPoint[]
  ): Promise<CorrelationMetrics> {
    // Simplified correlation matrix
    const assetCorrelations = {
      BTC: { BTC: 1.0, ETH: 0.7, SOL: 0.65 },
      ETH: { BTC: 0.7, ETH: 1.0, SOL: 0.75 },
      SOL: { BTC: 0.65, ETH: 0.75, SOL: 1.0 }
    };
    
    // Sector and market correlation
    const sectorCorrelation = 0.8; // High correlation with crypto sector
    const marketCorrelation = 0.4; // Moderate correlation with broad market
    
    // Correlation stability (0-1, higher is more stable)
    const correlationStability = 0.6;
    
    // Regime analysis
    const returns = this.calculateReturns(historicalData);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const recentVolatility = this.calculateVolatility(returns.slice(-20)).annualized;
    
    let currentRegime: 'Risk-On' | 'Risk-Off' | 'Neutral';
    if (avgReturn > 0.5 && recentVolatility < 60) currentRegime = 'Risk-On';
    else if (avgReturn < -0.5 || recentVolatility > 100) currentRegime = 'Risk-Off';
    else currentRegime = 'Neutral';
    
    const regimeProbabilities = {
      riskOn: currentRegime === 'Risk-On' ? 0.7 : 0.2,
      riskOff: currentRegime === 'Risk-Off' ? 0.7 : 0.2,
      neutral: currentRegime === 'Neutral' ? 0.6 : 0.3
    };
    
    return {
      assetCorrelations,
      sectorCorrelation,
      marketCorrelation,
      correlationStability,
      regimeAnalysis: {
        currentRegime,
        regimeProbabilities
      }
    };
  }

  /**
   * Calculate Value at Risk
   */
  private calculateValueAtRisk(historicalData: HistoricalDataPoint[]): ValueAtRiskAnalysis {
    const returns = this.calculateReturns(historicalData);
    
    // Sort returns for percentile calculation
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Calculate VaR at different confidence levels
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);
    
    const var95Daily = sortedReturns[var95Index];
    const var99Daily = sortedReturns[var99Index];
    
    // Scale to different time horizons (square root of time)
    const var95 = {
      daily: var95Daily,
      weekly: var95Daily * Math.sqrt(5),
      monthly: var95Daily * Math.sqrt(21)
    };
    
    const var99 = {
      daily: var99Daily,
      weekly: var99Daily * Math.sqrt(5),
      monthly: var99Daily * Math.sqrt(21)
    };
    
    // Conditional VaR (average of losses beyond VaR)
    const cvar95 = sortedReturns.slice(0, var95Index).reduce((sum, r) => sum + r, 0) / var95Index;
    const cvar99 = sortedReturns.slice(0, var99Index).reduce((sum, r) => sum + r, 0) / var99Index;
    
    // Expected shortfall
    const expectedShortfall = cvar95;
    
    // Tail risk (kurtosis proxy)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow(r - mean, 4), 0) / 
                    (returns.length * Math.pow(variance, 2));
    const tailRisk = Math.max(0, kurtosis - 3); // Excess kurtosis
    
    return {
      var95,
      var99,
      cvar95,
      cvar99,
      expectedShortfall,
      tailRisk,
      methodology: 'Historical'
    };
  }

  /**
   * Perform stress tests
   */
  private performStressTests(
    company: Company,
    cryptoPrices: CryptoPrice[]
  ): StressTestResults {
    const scenarios = [
      {
        name: 'Crypto Winter (-50%)',
        probability: 0.15,
        cryptoDecline: -0.5
      },
      {
        name: 'Market Correction (-30%)',
        probability: 0.25,
        cryptoDecline: -0.3
      },
      {
        name: 'Flash Crash (-20%)',
        probability: 0.35,
        cryptoDecline: -0.2
      },
      {
        name: 'Regulatory Shock (-40%)',
        probability: 0.10,
        cryptoDecline: -0.4
      },
      {
        name: 'Black Swan (-70%)',
        probability: 0.05,
        cryptoDecline: -0.7
      }
    ];
    
    const currentTreasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    const currentNAV = currentTreasuryValue + company.shareholdersEquity;
    
    const stressResults = scenarios.map(scenario => {
      const newTreasuryValue = currentTreasuryValue * (1 + scenario.cryptoDecline);
      const treasuryImpact = scenario.cryptoDecline * 100;
      const navImpact = (newTreasuryValue - currentTreasuryValue) / currentNAV * 100;
      
      // Liquidity impact
      const liquidityRatio = newTreasuryValue / company.totalDebt;
      const liquidityImpact = liquidityRatio < 1.5 ? 80 : liquidityRatio < 2 ? 40 : 20;
      
      // Solvency impact
      const solvencyRatio = (newTreasuryValue + company.shareholdersEquity) / company.totalDebt;
      const solvencyImpact = solvencyRatio < 1.2 ? 90 : solvencyRatio < 2 ? 50 : 20;
      
      // Overall impact
      let overallImpact: 'Low' | 'Medium' | 'High' | 'Severe';
      if (scenario.cryptoDecline <= -0.5) overallImpact = 'Severe';
      else if (scenario.cryptoDecline <= -0.3) overallImpact = 'High';
      else if (scenario.cryptoDecline <= -0.15) overallImpact = 'Medium';
      else overallImpact = 'Low';
      
      return {
        name: scenario.name,
        probability: scenario.probability,
        treasuryImpact,
        navImpact,
        liquidityImpact,
        solvencyImpact,
        overallImpact
      };
    });
    
    // Breaking point analysis
    const debtCoverage = currentTreasuryValue / company.totalDebt;
    const breakingPointDecline = Math.max(0, (1 - 1/debtCoverage)) * 100;
    
    return {
      scenarios: stressResults,
      breakingPoint: {
        treasuryDeclinePercent: breakingPointDecline,
        description: `Treasury can decline ${breakingPointDecline.toFixed(1)}% before debt coverage < 1.0x`
      },
      recoveryTime: 18 // Estimated months to recover from severe scenario
    };
  }

  /**
   * Generate risk scorecard
   */
  private generateRiskScorecard(
    marketRisk: MarketRiskMetrics,
    concentrationRisk: ConcentrationRiskAnalysis,
    liquidityRisk: LiquidityRiskMetrics,
    creditRisk: CreditRiskAssessment,
    operationalRisk: OperationalRiskMetrics
  ): RiskScorecard {
    // Score each risk category (0-100, lower is better)
    const marketRiskScore = Math.min(100, marketRisk.volatility.annualized * 0.8);
    const concentrationRiskScore = concentrationRisk.treasuryConcentration.herfindahlIndex * 100;
    const liquidityRiskScore = Math.max(0, 100 - liquidityRisk.currentRatio * 20);
    const creditRiskScore = creditRisk.defaultProbability * 100;
    const operationalRiskScore = operationalRisk.businessModelRisk;
    
    // Calculate overall score (weighted average)
    const overallScore = (
      marketRiskScore * 0.25 +
      concentrationRiskScore * 0.25 +
      liquidityRiskScore * 0.20 +
      creditRiskScore * 0.20 +
      operationalRiskScore * 0.10
    );
    
    // Determine category
    let category: 'Low' | 'Medium' | 'High' | 'Critical';
    if (overallScore < 25) category = 'Low';
    else if (overallScore < 50) category = 'Medium';
    else if (overallScore < 75) category = 'High';
    else category = 'Critical';
    
    // Key risks
    const keyRisks: string[] = [];
    if (marketRiskScore > 60) keyRisks.push('High market volatility');
    if (concentrationRiskScore > 60) keyRisks.push('Concentrated treasury holdings');
    if (liquidityRiskScore > 60) keyRisks.push('Liquidity constraints');
    if (creditRiskScore > 60) keyRisks.push('Elevated credit risk');
    if (operationalRiskScore > 60) keyRisks.push('Operational vulnerabilities');
    
    // Mitigation recommendations
    const mitigationRecommendations: string[] = [];
    if (concentrationRiskScore > 60) {
      mitigationRecommendations.push('Diversify treasury holdings across multiple assets');
    }
    if (liquidityRiskScore > 60) {
      mitigationRecommendations.push('Improve liquidity ratios through debt reduction or asset sales');
    }
    if (creditRiskScore > 60) {
      mitigationRecommendations.push('Refinance high-cost debt or improve interest coverage');
    }
    
    return {
      overallScore,
      category,
      breakdown: {
        marketRisk: marketRiskScore,
        concentrationRisk: concentrationRiskScore,
        liquidityRisk: liquidityRiskScore,
        creditRisk: creditRiskScore,
        operationalRisk: operationalRiskScore
      },
      peerPercentile: 50, // Would calculate from peer comparison
      trend: 'Stable', // Would calculate from historical scores
      keyRisks,
      mitigationRecommendations
    };
  }

  // Helper methods
  private calculateReturns(data: HistoricalDataPoint[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const return_pct = ((data[i].stockPrice - data[i-1].stockPrice) / data[i-1].stockPrice) * 100;
      returns.push(return_pct);
    }
    return returns;
  }

  private calculateVolatility(returns: number[]) {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyVol = Math.sqrt(variance);
    
    return {
      daily: dailyVol,
      weekly: dailyVol * Math.sqrt(5),
      monthly: dailyVol * Math.sqrt(21),
      annualized: dailyVol * Math.sqrt(252),
      impliedVolatility: undefined // Would come from options data
    };
  }

  private calculateMaxDrawdown(data: HistoricalDataPoint[]) {
    let maxDrawdown = 0;
    let peak = data[0].stockPrice;
    let maxDrawdownStart = data[0].date;
    let maxDrawdownEnd = data[0].date;
    let currentDrawdownStart = data[0].date;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i].stockPrice > peak) {
        peak = data[i].stockPrice;
        currentDrawdownStart = data[i].date;
      }
      
      const drawdown = (peak - data[i].stockPrice) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownStart = currentDrawdownStart;
        maxDrawdownEnd = data[i].date;
      }
    }
    
    const duration = Math.floor(
      (new Date(maxDrawdownEnd).getTime() - new Date(maxDrawdownStart).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    return {
      value: maxDrawdown * 100,
      startDate: new Date(maxDrawdownStart),
      endDate: new Date(maxDrawdownEnd),
      duration
    };
  }

  private calculateLiquidationRisk(crypto: string, amount: number): number {
    // Simplified liquidation risk based on daily volume assumptions
    const dailyVolumes = {
      BTC: 20000000000,
      ETH: 10000000000,
      SOL: 2000000000
    };
    
    const dailyVolume = dailyVolumes[crypto as keyof typeof dailyVolumes] || 1000000000;
    const impactPercent = (amount * 50000) / dailyVolume; // Assume $50k per coin avg
    
    return Math.min(100, impactPercent * 100);
  }

  private calculateTreasuryLiquidityScore(holdings: any[]): number {
    // Score based on asset liquidity (BTC most liquid, then ETH, then SOL)
    const liquidityScores = { BTC: 95, ETH: 85, SOL: 70 };
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    const weightedScore = holdings.reduce((sum, h) => {
      const weight = h.currentValue / totalValue;
      const score = liquidityScores[h.crypto as keyof typeof liquidityScores] || 50;
      return sum + weight * score;
    }, 0);
    
    return weightedScore;
  }

  private generateDebtMaturityProfile(company: Company) {
    // Simplified debt maturity profile
    const totalDebt = company.totalDebt;
    const treasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    
    return [
      { year: 1, amount: totalDebt * 0.2, percentOfTreasury: (totalDebt * 0.2) / treasuryValue * 100 },
      { year: 2, amount: totalDebt * 0.2, percentOfTreasury: (totalDebt * 0.2) / treasuryValue * 100 },
      { year: 3, amount: totalDebt * 0.3, percentOfTreasury: (totalDebt * 0.3) / treasuryValue * 100 },
      { year: 4, amount: totalDebt * 0.2, percentOfTreasury: (totalDebt * 0.2) / treasuryValue * 100 },
      { year: 5, amount: totalDebt * 0.1, percentOfTreasury: (totalDebt * 0.1) / treasuryValue * 100 }
    ];
  }

  private estimateLiquidationTime(holdings: any[], percent: number): number {
    // Estimate days to liquidate based on typical daily volume participation
    const maxDailyParticipation = 0.02; // 2% of daily volume
    const daysNeeded = percent / maxDailyParticipation;
    return Math.ceil(daysNeeded);
  }

  private estimateMarketImpact(holdings: any[]): number {
    // Estimate price impact of full liquidation
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const impactBasisPoints = Math.min(500, totalValue / 10000000); // 1bp per $10M
    return impactBasisPoints;
  }
}

export default RiskEngine;