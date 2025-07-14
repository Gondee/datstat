/**
 * Enhanced mNAV (modified Net Asset Value) Calculation Engine
 * Real-time NAV calculations with advanced methodologies
 */

import { Company, TreasuryHolding, HistoricalDataPoint, CryptoPrice } from '@/types';
import { getPrismaClient } from '@/lib/db';

export interface NAVComponents {
  treasuryValue: number;
  shareholdersEquity: number;
  adjustedShareholderEquity: number;
  intangibleAssets: number;
  deferredTaxAssets: number;
  workingCapital: number;
  netCash: number;
  operatingAssets: number;
}

export interface NAVCalculation {
  basicNAV: number;
  basicNAVPerShare: number;
  dilutedNAV: number;
  dilutedNAVPerShare: number;
  assumedDilutedNAV: number;
  assumedDilutedNAVPerShare: number;
  components: NAVComponents;
  shareCountDetails: {
    basic: number;
    diluted: number;
    assumedDiluted: number;
    dilutionPercent: number;
  };
  premiumDiscount: {
    toBasicNAV: number;
    toBasicNAVPercent: number;
    toDilutedNAV: number;
    toDilutedNAVPercent: number;
    toAssumedDilutedNAV: number;
    toAssumedDilutedNAVPercent: number;
  };
  timestamp: Date;
}

export interface NAVProjection {
  scenario: string;
  cryptoPriceAssumptions: { [key: string]: number };
  projectedNAV: number;
  projectedNAVPerShare: number;
  projectedPremiumDiscount: number;
  probability: number;
  timeHorizon: string;
}

export class EnhancedNAVEngine {
  private prisma = getPrismaClient();

  /**
   * Calculate real-time NAV with all components
   */
  async calculateRealTimeNAV(
    company: Company,
    cryptoPrices: CryptoPrice[],
    stockPrice: number
  ): Promise<NAVCalculation> {
    // Get latest treasury values at current market prices
    const treasuryValue = this.calculateTreasuryValue(company.treasury, cryptoPrices);
    
    // Calculate NAV components
    const components = this.calculateNAVComponents(company, treasuryValue);
    
    // Get share counts
    const shareCountDetails = this.calculateShareCounts(company);
    
    // Calculate NAVs
    const totalAssetValue = treasuryValue + components.adjustedShareholderEquity;
    
    const basicNAV = totalAssetValue;
    const basicNAVPerShare = basicNAV / shareCountDetails.basic;
    
    const dilutedNAV = totalAssetValue;
    const dilutedNAVPerShare = dilutedNAV / shareCountDetails.diluted;
    
    const assumedDilutedNAV = totalAssetValue;
    const assumedDilutedNAVPerShare = assumedDilutedNAV / shareCountDetails.assumedDiluted;
    
    // Calculate premium/discount
    const premiumDiscount = {
      toBasicNAV: stockPrice - basicNAVPerShare,
      toBasicNAVPercent: ((stockPrice - basicNAVPerShare) / basicNAVPerShare) * 100,
      toDilutedNAV: stockPrice - dilutedNAVPerShare,
      toDilutedNAVPercent: ((stockPrice - dilutedNAVPerShare) / dilutedNAVPerShare) * 100,
      toAssumedDilutedNAV: stockPrice - assumedDilutedNAVPerShare,
      toAssumedDilutedNAVPercent: ((stockPrice - assumedDilutedNAVPerShare) / assumedDilutedNAVPerShare) * 100,
    };
    
    return {
      basicNAV,
      basicNAVPerShare,
      dilutedNAV,
      dilutedNAVPerShare,
      assumedDilutedNAV,
      assumedDilutedNAVPerShare,
      components,
      shareCountDetails,
      premiumDiscount,
      timestamp: new Date()
    };
  }

  /**
   * Calculate treasury value at current market prices
   */
  private calculateTreasuryValue(
    holdings: TreasuryHolding[],
    cryptoPrices: CryptoPrice[]
  ): number {
    return holdings.reduce((total, holding) => {
      const price = cryptoPrices.find(p => p.symbol === holding.crypto)?.price || 0;
      return total + (holding.amount * price);
    }, 0);
  }

  /**
   * Calculate NAV components with adjustments
   */
  private calculateNAVComponents(company: Company, treasuryValue: number): NAVComponents {
    // Extract balance sheet items
    const shareholdersEquity = company.shareholdersEquity;
    
    // Estimate intangible assets and adjustments (would come from detailed filings)
    const intangibleAssets = shareholdersEquity * 0.1; // Estimate 10% intangibles
    const deferredTaxAssets = company.totalDebt * 0.05; // Estimate DTA
    
    // Adjust shareholders equity
    const adjustedShareholderEquity = shareholdersEquity - intangibleAssets + deferredTaxAssets;
    
    // Working capital estimate
    const workingCapital = company.businessModel.operatingRevenue * 0.15;
    
    // Net cash (excluding treasury crypto)
    const netCash = Math.max(0, shareholdersEquity * 0.05 - company.totalDebt);
    
    // Operating assets
    const operatingAssets = company.businessModel.legacyBusinessValue;
    
    return {
      treasuryValue,
      shareholdersEquity,
      adjustedShareholderEquity,
      intangibleAssets,
      deferredTaxAssets,
      workingCapital,
      netCash,
      operatingAssets
    };
  }

  /**
   * Calculate all share count variations
   */
  private calculateShareCounts(company: Company) {
    const basic = company.capitalStructure.sharesBasic;
    const diluted = company.capitalStructure.sharesDilutedCurrent;
    
    // Calculate assumed diluted shares
    let assumedDiluted = basic;
    
    // Add convertible debt dilution
    company.capitalStructure.convertibleDebt.forEach(debt => {
      if (debt.isOutstanding && debt.conversionPrice > 0) {
        assumedDiluted += debt.principal / debt.conversionPrice;
      }
    });
    
    // Add warrant dilution
    company.capitalStructure.warrants.forEach(warrant => {
      if (warrant.isOutstanding) {
        assumedDiluted += warrant.totalWarrants * warrant.sharesPerWarrant;
      }
    });
    
    // Add options and RSUs
    assumedDiluted += company.capitalStructure.stockOptions;
    assumedDiluted += company.capitalStructure.restrictedStockUnits;
    assumedDiluted += company.capitalStructure.performanceStockUnits;
    
    const dilutionPercent = ((assumedDiluted - basic) / basic) * 100;
    
    return {
      basic,
      diluted,
      assumedDiluted,
      dilutionPercent
    };
  }

  /**
   * Track NAV time series for historical analysis
   */
  async saveNAVTimeSeries(
    ticker: string,
    calculation: NAVCalculation
  ): Promise<void> {
    await this.prisma.historicalMetric.create({
      data: {
        companyId: ticker,
        date: calculation.timestamp,
        stockPrice: 0, // TODO: Get actual stock price
        navPerShare: calculation.assumedDilutedNAVPerShare,
        premiumToNav: calculation.premiumDiscount.toAssumedDilutedNAVPercent,
        treasuryValue: calculation.components.treasuryValue,
        volume: 0, // TODO: Get actual volume
        sharesOutstanding: calculation.shareCountDetails.basic,
        sharesDiluted: calculation.shareCountDetails.assumedDiluted
      }
    });
  }

  /**
   * Generate NAV projections under different scenarios
   */
  generateNAVProjections(
    company: Company,
    currentNAV: NAVCalculation,
    scenarios: Array<{ name: string; btcPrice?: number; ethPrice?: number; solPrice?: number }>
  ): NAVProjection[] {
    const projections: NAVProjection[] = [];
    
    scenarios.forEach(scenario => {
      // Calculate new treasury value under scenario
      let projectedTreasuryValue = 0;
      
      company.treasury.forEach(holding => {
        let price = 0;
        if (holding.crypto === 'BTC' && scenario.btcPrice) price = scenario.btcPrice;
        if (holding.crypto === 'ETH' && scenario.ethPrice) price = scenario.ethPrice;
        if (holding.crypto === 'SOL' && scenario.solPrice) price = scenario.solPrice;
        
        projectedTreasuryValue += holding.amount * price;
      });
      
      // Calculate projected NAV
      const projectedNAV = projectedTreasuryValue + currentNAV.components.adjustedShareholderEquity;
      const projectedNAVPerShare = projectedNAV / currentNAV.shareCountDetails.assumedDiluted;
      
      // Estimate stock price movement (1.5x leverage to crypto)
      const treasuryChange = (projectedTreasuryValue - currentNAV.components.treasuryValue) / 
                           currentNAV.components.treasuryValue;
      const estimatedStockPrice = currentNAV.premiumDiscount.toAssumedDilutedNAV * 
                                (1 + treasuryChange * 1.5);
      
      const projectedPremiumDiscount = ((estimatedStockPrice - projectedNAVPerShare) / 
                                      projectedNAVPerShare) * 100;
      
      // Assign probability based on scenario
      let probability = 0.5; // Base case
      if (scenario.name.includes('Bull')) probability = 0.3;
      if (scenario.name.includes('Bear')) probability = 0.2;
      
      projections.push({
        scenario: scenario.name,
        cryptoPriceAssumptions: {
          BTC: scenario.btcPrice || 0,
          ETH: scenario.ethPrice || 0,
          SOL: scenario.solPrice || 0
        },
        projectedNAV,
        projectedNAVPerShare,
        projectedPremiumDiscount,
        probability,
        timeHorizon: '6 months'
      });
    });
    
    return projections;
  }

  /**
   * Compare NAV across time periods
   */
  async getNAVTimeSeries(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: Date;
    navPerShare: number;
    premiumToNav: number;
    treasuryValue: number;
  }>> {
    const historicalData = await this.prisma.historicalMetric.findMany({
      where: {
        companyId: ticker,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    return historicalData.map(point => ({
      date: point.date,
      navPerShare: point.navPerShare || 0,
      premiumToNav: point.premiumToNav || 0,
      treasuryValue: point.treasuryValue || 0
    }));
  }

  /**
   * Calculate NAV attribution analysis
   */
  async calculateNAVAttribution(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalNAVChange: number;
    treasuryContribution: number;
    equityContribution: number;
    dilutionImpact: number;
    otherFactors: number;
  }> {
    const startData = await this.prisma.historicalMetric.findFirst({
      where: {
        companyId: ticker,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });
    
    const endData = await this.prisma.historicalMetric.findFirst({
      where: {
        companyId: ticker,
        date: { lte: endDate }
      },
      orderBy: { date: 'desc' }
    });
    
    if (!startData || !endData) {
      return {
        totalNAVChange: 0,
        treasuryContribution: 0,
        equityContribution: 0,
        dilutionImpact: 0,
        otherFactors: 0
      };
    }
    
    const startNAV = startData.navPerShare || 0;
    const endNAV = endData.navPerShare || 0;
    const totalNAVChange = ((endNAV - startNAV) / startNAV) * 100;
    
    // Calculate contributions using available data
    const startTreasuryValue = startData.treasuryValue || 0;
    const endTreasuryValue = endData.treasuryValue || 0;
    
    // Calculate contributions (simplified without metadata)
    const treasuryContribution = startTreasuryValue > 0 ? 
      ((endTreasuryValue - startTreasuryValue) / startTreasuryValue) * 100 : 0;
    
    const equityContribution = 0; // Would need more data to calculate
    
    const dilutionImpact = startData.sharesDiluted > 0 ? 
      -((endData.sharesDiluted - startData.sharesDiluted) / startData.sharesDiluted) * 100 : 0;
    
    const otherFactors = totalNAVChange - treasuryContribution - equityContribution - dilutionImpact;
    
    return {
      totalNAVChange,
      treasuryContribution,
      equityContribution,
      dilutionImpact,
      otherFactors
    };
  }
}

export default EnhancedNAVEngine;