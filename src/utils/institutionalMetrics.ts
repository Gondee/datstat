import { 
  Company, 
  CalculatedMetrics, 
  HistoricalDataPoint, 
  ScenarioAnalysis,
  RiskAssessment
} from '@/types';

/**
 * Comprehensive institutional metrics calculation engine
 * Based on MicroStrategy, DFDV, UPXI, SBET analysis patterns
 */

export class InstitutionalMetricsEngine {
  
  /**
   * Calculate Crypto Yield - Key performance indicator for DAT companies
   * Based on MicroStrategy's BTC Yield methodology
   */
  static calculateCryptoYield(
    currentCryptoPerShare: number,
    previousCryptoPerShare: number,
    timeFrame: 'quarterly' | 'yearly' = 'yearly'
  ): number {
    if (previousCryptoPerShare === 0) return 0;
    const yieldPercent = ((currentCryptoPerShare - previousCryptoPerShare) / previousCryptoPerShare) * 100;
    
    // Annualize if quarterly
    if (timeFrame === 'quarterly') {
      return yieldPercent * 4;
    }
    return yieldPercent;
  }

  /**
   * Calculate Assumed Diluted Shares Outstanding
   * Includes all potential dilution from convertibles, warrants, options
   */
  static calculateAssumedDilutedShares(company: Company): number {
    const { capitalStructure } = company;
    let dilutedShares = capitalStructure.sharesBasic;
    
    // Add convertible debt potential dilution
    capitalStructure.convertibleDebt.forEach(debt => {
      if (debt.isOutstanding && debt.conversionRatio > 0) {
        const potentialShares = debt.principal / debt.conversionPrice;
        dilutedShares += potentialShares;
      }
    });
    
    // Add warrant dilution
    capitalStructure.warrants.forEach(warrant => {
      if (warrant.isOutstanding) {
        dilutedShares += warrant.totalWarrants * warrant.sharesPerWarrant;
      }
    });
    
    // Add stock options and RSUs
    dilutedShares += capitalStructure.stockOptions;
    dilutedShares += capitalStructure.restrictedStockUnits;
    dilutedShares += capitalStructure.performanceStockUnits;
    
    return dilutedShares;
  }

  /**
   * Calculate Dilution Rate and Treasury Accretion Metrics
   */
  static calculateDilutionMetrics(
    company: Company,
    historicalData: HistoricalDataPoint[]
  ): {
    dilutionRate: number;
    shareCountGrowth: number;
    treasuryAccretionRate: number;
    dilutionAdjustedReturn: number;
  } {
    if (historicalData.length < 2) {
      return { dilutionRate: 0, shareCountGrowth: 0, treasuryAccretionRate: 0, dilutionAdjustedReturn: 0 };
    }
    
    const latest = historicalData[historicalData.length - 1];
    const yearAgo = historicalData[0];
    
    const shareCountGrowth = ((latest.sharesDiluted - yearAgo.sharesDiluted) / yearAgo.sharesDiluted) * 100;
    const treasuryGrowth = ((latest.treasuryValue - yearAgo.treasuryValue) / yearAgo.treasuryValue) * 100;
    const treasuryAccretionRate = treasuryGrowth - shareCountGrowth;
    
    // Stock performance adjusted for dilution
    const stockReturn = ((latest.stockPrice - yearAgo.stockPrice) / yearAgo.stockPrice) * 100;
    const dilutionAdjustedReturn = stockReturn - shareCountGrowth;
    
    return {
      dilutionRate: shareCountGrowth,
      shareCountGrowth,
      treasuryAccretionRate,
      dilutionAdjustedReturn
    };
  }

  /**
   * Calculate Risk Metrics for institutional analysis
   */
  static calculateRiskMetrics(
    company: Company,
    historicalData: HistoricalDataPoint[]
  ): {
    impliedVolatility: number;
    beta: number;
    treasuryConcentrationRisk: number;
    liquidityRisk: number;
    debtServiceCoverage: number;
  } {
    let impliedVolatility = 0;
    let beta = 0;
    
    // Calculate volatility from historical data
    if (historicalData.length > 0) {
      const returns = historicalData.map((point, index) => {
        if (index === 0) return 0;
        return (point.stockPrice - historicalData[index - 1].stockPrice) / historicalData[index - 1].stockPrice;
      }).slice(1);
      
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      impliedVolatility = Math.sqrt(variance * 252) * 100; // Annualized volatility
      
      // Simple beta calculation (would need market data in real implementation)
      beta = impliedVolatility / 60; // Approximate beta vs crypto market
    }
    
    // Treasury concentration risk (0-100 scale)
    const primaryHolding = Math.max(...company.treasury.map(h => h.currentValue));
    const totalTreasury = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    const concentrationRisk = (primaryHolding / totalTreasury) * 100;
    
    // Liquidity risk based on debt levels and treasury
    const liquidityRisk = (company.totalDebt / totalTreasury) * 100;
    
    // Debt service coverage
    const annualDebtService = company.totalDebt * 0.05; // Assume 5% avg interest
    const operatingIncome = company.businessModel.operatingRevenue - company.businessModel.operatingExpenses;
    const debtServiceCoverage = operatingIncome / annualDebtService;
    
    return {
      impliedVolatility,
      beta,
      treasuryConcentrationRisk: concentrationRisk,
      liquidityRisk,
      debtServiceCoverage
    };
  }

  /**
   * Calculate Capital Efficiency Metrics
   */
  static calculateCapitalEfficiency(
    company: Company
  ): {
    capitalAllocationScore: number;
    treasuryROI: number;
    costOfCapital: number;
    capitalTurnover: number;
  } {
    const totalTreasuryValue = company.treasury.reduce((sum, holding) => sum + holding.currentValue, 0);
    const totalCost = company.treasury.reduce((sum, holding) => sum + holding.totalCost, 0);
    const treasuryROI = ((totalTreasuryValue - totalCost) / totalCost) * 100;
    
    // Cost of capital calculation (simplified)
    let avgInterestRate = 0;
    if (company.capitalStructure.convertibleDebt.length > 0) {
      avgInterestRate = company.capitalStructure.convertibleDebt.reduce((sum, debt) => 
        sum + debt.interestRate, 0) / company.capitalStructure.convertibleDebt.length;
    }
    
    const costOfCapital = avgInterestRate + 5; // Add equity risk premium
    
    // Capital allocation score (0-100)
    const capitalAllocationScore = Math.min(100, Math.max(0, treasuryROI - costOfCapital + 50));
    
    // Capital turnover
    const capitalTurnover = company.businessModel.operatingRevenue / (company.shareholdersEquity || 1);
    
    return {
      capitalAllocationScore,
      treasuryROI,
      costOfCapital,
      capitalTurnover
    };
  }

  /**
   * Operational Metrics Analysis
   */
  static calculateOperationalMetrics(company: Company): {
    revenueDiversification: number;
    operatingLeverage: number;
    treasuryFocusRatio: number;
    cashBurnCoverage: number;
  } {
    const revenueStreams = company.businessModel.revenueStreams.length;
    const revenueDiversification = Math.min(100, revenueStreams * 25); // Max 100 for 4+ streams
    
    const operatingRevenue = company.businessModel.operatingRevenue;
    const operatingExpenses = company.businessModel.operatingExpenses;
    const operatingLeverage = operatingRevenue > 0 ? (operatingRevenue - operatingExpenses) / operatingRevenue * 100 : -100;
    
    const treasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    const treasuryFocusRatio = treasuryValue / (treasuryValue + company.businessModel.legacyBusinessValue) * 100;
    
    const cashBurnCoverage = treasuryValue / Math.abs(company.businessModel.cashBurnRate);
    
    return {
      revenueDiversification,
      operatingLeverage,
      treasuryFocusRatio,
      cashBurnCoverage
    };
  }

  /**
   * Generate Comprehensive Risk Assessment
   */
  static generateRiskAssessment(company: Company, metrics: CalculatedMetrics): RiskAssessment {
    const { riskMetrics, operationalMetrics } = metrics;
    
    // Risk scoring logic
    const liquidityRisk = riskMetrics.liquidityRisk > 50 ? 'high' : 
                         riskMetrics.liquidityRisk > 25 ? 'medium' : 'low';
    
    const concentrationRisk = riskMetrics.treasuryConcentrationRisk > 80 ? 'high' :
                             riskMetrics.treasuryConcentrationRisk > 60 ? 'medium' : 'low';
    
    const dilutionRisk = metrics.dilutionMetrics.dilutionRate > 50 ? 'high' :
                        metrics.dilutionMetrics.dilutionRate > 20 ? 'medium' : 'low';
    
    const operationalRisk = operationalMetrics.operatingLeverage < -50 ? 'high' :
                           operationalMetrics.operatingLeverage < 0 ? 'medium' : 'low';
    
    const regulatoryRisk = 'medium'; // Default - would need more analysis
    
    // Overall risk calculation
    const riskFactors = [liquidityRisk, concentrationRisk, dilutionRisk, operationalRisk, regulatoryRisk];
    const highRisks = riskFactors.filter(r => r === 'high').length;
    const mediumRisks = riskFactors.filter(r => r === 'medium').length;
    
    const overallRisk = highRisks >= 2 ? 'high' : 
                       highRisks >= 1 || mediumRisks >= 3 ? 'medium' : 'low';
    
    const riskScore = (highRisks * 30) + (mediumRisks * 15) + ((5 - highRisks - mediumRisks) * 5);
    
    return {
      liquidityRisk: liquidityRisk as 'low' | 'medium' | 'high',
      concentrationRisk: concentrationRisk as 'low' | 'medium' | 'high',
      dilutionRisk: dilutionRisk as 'low' | 'medium' | 'high',
      operationalRisk: operationalRisk as 'low' | 'medium' | 'high',
      regulatoryRisk: regulatoryRisk as 'low' | 'medium' | 'high',
      overallRisk: overallRisk as 'low' | 'medium' | 'high',
      riskScore
    };
  }

  /**
   * Scenario Analysis for stress testing
   */
  static runScenarioAnalysis(
    company: Company,
    cryptoPriceChanges: number[]
  ): ScenarioAnalysis[] {
    const scenarios: ScenarioAnalysis[] = [];
    const currentTreasuryValue = company.treasury.reduce((sum, h) => sum + h.currentValue, 0);
    
    cryptoPriceChanges.forEach((priceChange) => {
      const newTreasuryValue = currentTreasuryValue * (1 + priceChange / 100);
      const treasuryImpact = priceChange;
      
      // Estimate stock price impact (leveraged to crypto)
      const stockPriceImpact = priceChange * 1.5; // Assume 1.5x leverage
      
      // Liquidation pressure (higher when prices fall and debt is high)
      const liquidationPressure = priceChange < -20 && company.totalDebt > currentTreasuryValue * 0.3 ? 
        Math.abs(priceChange) * 2 : Math.abs(priceChange) * 0.5;
      
      // Debt service risk
      const debtServiceRisk = company.totalDebt > newTreasuryValue * 0.5 ? 
        Math.abs(priceChange) * 1.5 : Math.abs(priceChange) * 0.3;
      
      scenarios.push({
        name: `${priceChange > 0 ? '+' : ''}${priceChange}% Crypto Price Change`,
        cryptoPriceChange: priceChange,
        stockPriceImpact,
        treasuryValueImpact: treasuryImpact,
        liquidationPressure,
        debtServiceRisk
      });
    });
    
    return scenarios;
  }

  /**
   * Calculate comprehensive institutional metrics
   */
  static calculateComprehensiveMetrics(
    company: Company,
    historicalData: HistoricalDataPoint[] = []
  ): CalculatedMetrics {
    // Calculate basic metrics
    const treasuryValue = company.treasury.reduce((sum, holding) => sum + holding.currentValue, 0);
    const assumedDilutedShares = this.calculateAssumedDilutedShares(company);
    const treasuryValuePerShare = treasuryValue / assumedDilutedShares;
    const navPerShare = (treasuryValue + company.shareholdersEquity) / assumedDilutedShares;
    
    // Get current stock price (would come from market data)
    const stockPrice = company.marketCap / company.sharesOutstanding;
    const premiumToNav = stockPrice - navPerShare;
    const premiumToNavPercent = (premiumToNav / navPerShare) * 100;
    
    // Calculate advanced metrics
    const dilutionMetrics = this.calculateDilutionMetrics(company, historicalData);
    const riskMetrics = this.calculateRiskMetrics(company, historicalData);
    const capitalEfficiency = this.calculateCapitalEfficiency(company);
    const operationalMetrics = this.calculateOperationalMetrics(company);
    
    // Calculate crypto yield for each asset
    const btcHolding = company.treasury.find(h => h.crypto === 'BTC');
    const ethHolding = company.treasury.find(h => h.crypto === 'ETH');
    const solHolding = company.treasury.find(h => h.crypto === 'SOL');
    
    // Simplified crypto yield calculation (would need historical per-share data)
    const cryptoYield = {
      btcYield: btcHolding ? 25.5 : undefined, // Mock data
      ethYield: ethHolding ? 15.2 : undefined,
      solYield: solHolding ? 45.8 : undefined,
      totalCryptoYield: dilutionMetrics.treasuryAccretionRate
    };
    
    const debtToTreasuryRatio = company.totalDebt / treasuryValue;
    
    const treasuryConcentration: { [key: string]: number } = {};
    company.treasury.forEach(holding => {
      treasuryConcentration[holding.crypto] = (holding.currentValue / treasuryValue) * 100;
    });
    
    return {
      ticker: company.ticker,
      treasuryValue,
      treasuryValuePerShare,
      navPerShare,
      stockPrice,
      premiumToNav,
      premiumToNavPercent,
      debtToTreasuryRatio,
      treasuryConcentration,
      cryptoYield,
      dilutionMetrics,
      riskMetrics,
      capitalEfficiency,
      operationalMetrics
    };
  }
}

export default InstitutionalMetricsEngine;