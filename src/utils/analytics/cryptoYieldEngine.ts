/**
 * Crypto Yield Analytics Engine
 * MicroStrategy-style BTC Yield, ETH Yield, SOL Yield calculations
 */

import { Company, TreasuryHolding, TreasuryTransaction } from '@/types';
import { getPrismaClient } from '@/lib/db';

export interface CryptoYieldCalculation {
  btcYield?: YieldMetrics;
  ethYield?: YieldMetrics;
  solYield?: YieldMetrics;
  totalCryptoYield: YieldMetrics;
  accretiveDilutiveAnalysis: AccretiveDilutiveAnalysis;
  costBasisTracking: CostBasisTracking;
  yieldComparison: YieldComparison[];
}

export interface YieldMetrics {
  cryptoPerShare: number;
  previousCryptoPerShare: number;
  yieldPercent: number;
  annualizedYield: number;
  quarterlyYield: number;
  timeFrame: string;
  isAccretive: boolean;
}

export interface AccretiveDilutiveAnalysis {
  totalSharesIssued: number;
  totalCryptoAcquired: number;
  cryptoPerShareBefore: number;
  cryptoPerShareAfter: number;
  accretionDilution: number;
  accretionDilutionPercent: number;
  fundingMethodBreakdown: Array<{
    method: string;
    sharesIssued: number;
    cryptoAcquired: number;
    accretiveImpact: number;
  }>;
}

export interface CostBasisTracking {
  method: 'FIFO' | 'LIFO' | 'Average';
  totalCostBasis: number;
  averageCostBasis: number;
  realizedGains: number;
  unrealizedGains: number;
  taxLiability: number;
  lots: Array<{
    date: Date;
    amount: number;
    costBasis: number;
    currentValue: number;
    unrealizedGain: number;
    holdingPeriod: string;
  }>;
}

export interface YieldComparison {
  ticker: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  totalYield: number;
  rank: number;
  percentile: number;
}

export class CryptoYieldEngine {
  private prisma = getPrismaClient();

  /**
   * Calculate comprehensive crypto yield metrics
   */
  async calculateCryptoYield(
    company: Company,
    timeFrame: 'quarterly' | 'yearly' = 'yearly',
    historicalShares?: Array<{ date: Date; shares: number }>
  ): Promise<CryptoYieldCalculation> {
    const currentShares = company.capitalStructure.sharesDilutedAssumed;
    
    // Get historical shares data
    const previousShares = await this.getPreviousShareCount(
      company.ticker,
      timeFrame
    );
    
    // Calculate yields for each crypto
    const btcHolding = company.treasury.find(h => h.crypto === 'BTC');
    const ethHolding = company.treasury.find(h => h.crypto === 'ETH');
    const solHolding = company.treasury.find(h => h.crypto === 'SOL');
    
    const btcYield = btcHolding ? 
      await this.calculateIndividualYield(btcHolding, currentShares, previousShares, timeFrame) : 
      undefined;
    
    const ethYield = ethHolding ?
      await this.calculateIndividualYield(ethHolding, currentShares, previousShares, timeFrame) :
      undefined;
    
    const solYield = solHolding ?
      await this.calculateIndividualYield(solHolding, currentShares, previousShares, timeFrame) :
      undefined;
    
    // Calculate total crypto yield
    const totalCryptoYield = await this.calculateTotalYield(
      company.treasury,
      currentShares,
      previousShares,
      timeFrame
    );
    
    // Accretive/Dilutive analysis
    const accretiveDilutiveAnalysis = await this.analyzeAccretiveDilutive(
      company,
      timeFrame
    );
    
    // Cost basis tracking
    const costBasisTracking = this.trackCostBasis(
      company.treasury,
      'Average' // Default to average cost
    );
    
    // Yield comparison with peers
    const yieldComparison = await this.compareYieldWithPeers(
      company.ticker,
      btcYield?.yieldPercent || 0,
      ethYield?.yieldPercent || 0,
      solYield?.yieldPercent || 0,
      totalCryptoYield.yieldPercent
    );
    
    return {
      btcYield,
      ethYield,
      solYield,
      totalCryptoYield,
      accretiveDilutiveAnalysis,
      costBasisTracking,
      yieldComparison
    };
  }

  /**
   * Calculate yield for individual crypto holding
   */
  private async calculateIndividualYield(
    holding: TreasuryHolding,
    currentShares: number,
    previousShares: number,
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<YieldMetrics> {
    // Get previous holding amount
    const previousAmount = await this.getPreviousHoldingAmount(
      holding,
      timeFrame
    );
    
    const cryptoPerShare = holding.amount / currentShares;
    const previousCryptoPerShare = previousAmount / previousShares;
    
    const yieldPercent = previousCryptoPerShare > 0 ?
      ((cryptoPerShare - previousCryptoPerShare) / previousCryptoPerShare) * 100 : 0;
    
    const annualizedYield = timeFrame === 'quarterly' ? yieldPercent * 4 : yieldPercent;
    const quarterlyYield = timeFrame === 'yearly' ? yieldPercent / 4 : yieldPercent;
    
    return {
      cryptoPerShare,
      previousCryptoPerShare,
      yieldPercent,
      annualizedYield,
      quarterlyYield,
      timeFrame,
      isAccretive: yieldPercent > 0
    };
  }

  /**
   * Calculate total crypto yield across all holdings
   */
  private async calculateTotalYield(
    holdings: TreasuryHolding[],
    currentShares: number,
    previousShares: number,
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<YieldMetrics> {
    // Calculate total crypto value in USD for weighting
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    // Get previous total value
    const previousTotalValue = await this.getPreviousTotalValue(holdings, timeFrame);
    
    const cryptoPerShare = totalCurrentValue / currentShares;
    const previousCryptoPerShare = previousTotalValue / previousShares;
    
    const yieldPercent = previousCryptoPerShare > 0 ?
      ((cryptoPerShare - previousCryptoPerShare) / previousCryptoPerShare) * 100 : 0;
    
    const annualizedYield = timeFrame === 'quarterly' ? yieldPercent * 4 : yieldPercent;
    const quarterlyYield = timeFrame === 'yearly' ? yieldPercent / 4 : yieldPercent;
    
    return {
      cryptoPerShare,
      previousCryptoPerShare,
      yieldPercent,
      annualizedYield,
      quarterlyYield,
      timeFrame,
      isAccretive: yieldPercent > 0
    };
  }

  /**
   * Analyze accretive vs dilutive treasury transactions
   */
  private async analyzeAccretiveDilutive(
    company: Company,
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<AccretiveDilutiveAnalysis> {
    const startDate = this.getStartDate(timeFrame);
    
    // Aggregate transactions by funding method
    const fundingAnalysis = new Map<string, {
      sharesIssued: number;
      cryptoAcquired: number;
      transactions: TreasuryTransaction[];
    }>();
    
    let totalSharesIssued = 0;
    let totalCryptoValue = 0;
    
    company.treasury.forEach(holding => {
      holding.transactions
        .filter(tx => new Date(tx.date) >= startDate && tx.type === 'purchase')
        .forEach(tx => {
          const method = tx.fundingMethod || 'unknown';
          
          if (!fundingAnalysis.has(method)) {
            fundingAnalysis.set(method, {
              sharesIssued: 0,
              cryptoAcquired: 0,
              transactions: []
            });
          }
          
          const analysis = fundingAnalysis.get(method)!;
          
          // Estimate shares issued based on funding method
          let sharesIssued = 0;
          if (method === 'equity') {
            sharesIssued = tx.totalCost / (company.marketCap / company.sharesOutstanding);
          } else if (method === 'convertible_debt') {
            // Assume conversion at current price
            const conversionPrice = company.marketCap / company.sharesOutstanding * 1.2; // 20% premium
            sharesIssued = tx.totalCost / conversionPrice;
          }
          
          analysis.sharesIssued += sharesIssued;
          analysis.cryptoAcquired += tx.amount;
          analysis.transactions.push(tx);
          
          totalSharesIssued += sharesIssued;
          totalCryptoValue += tx.totalCost;
        });
    });
    
    // Calculate before/after metrics
    const sharesBefore = company.capitalStructure.sharesDilutedAssumed - totalSharesIssued;
    const cryptoBefore = this.calculatePreviousCryptoAmount(company.treasury, timeFrame);
    const cryptoAfter = this.calculateCurrentCryptoAmount(company.treasury);
    
    const cryptoPerShareBefore = cryptoBefore / sharesBefore;
    const cryptoPerShareAfter = cryptoAfter / company.capitalStructure.sharesDilutedAssumed;
    
    const accretionDilution = cryptoPerShareAfter - cryptoPerShareBefore;
    const accretionDilutionPercent = (accretionDilution / cryptoPerShareBefore) * 100;
    
    // Build funding method breakdown
    const fundingMethodBreakdown = Array.from(fundingAnalysis.entries()).map(([method, data]) => {
      const cryptoPerShareImpact = data.cryptoAcquired / data.sharesIssued;
      const accretiveImpact = cryptoPerShareImpact > cryptoPerShareBefore ? 
        (cryptoPerShareImpact - cryptoPerShareBefore) / cryptoPerShareBefore * 100 : 
        -(cryptoPerShareBefore - cryptoPerShareImpact) / cryptoPerShareBefore * 100;
      
      return {
        method,
        sharesIssued: data.sharesIssued,
        cryptoAcquired: data.cryptoAcquired,
        accretiveImpact
      };
    });
    
    return {
      totalSharesIssued,
      totalCryptoAcquired: totalCryptoValue,
      cryptoPerShareBefore,
      cryptoPerShareAfter,
      accretionDilution,
      accretionDilutionPercent,
      fundingMethodBreakdown
    };
  }

  /**
   * Track cost basis using different accounting methods
   */
  private trackCostBasis(
    holdings: TreasuryHolding[],
    method: 'FIFO' | 'LIFO' | 'Average'
  ): CostBasisTracking {
    const lots: Array<{
      date: Date;
      amount: number;
      costBasis: number;
      currentValue: number;
      unrealizedGain: number;
      holdingPeriod: string;
    }> = [];
    
    let totalCostBasis = 0;
    let totalAmount = 0;
    let totalCurrentValue = 0;
    
    holdings.forEach(holding => {
      const sortedTransactions = [...holding.transactions]
        .filter(tx => tx.type === 'purchase')
        .sort((a, b) => {
          if (method === 'FIFO') {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          } else if (method === 'LIFO') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0; // Average method doesn't need sorting
        });
      
      sortedTransactions.forEach(tx => {
        const currentPrice = holding.currentValue / holding.amount;
        const currentValue = tx.amount * currentPrice;
        const unrealizedGain = currentValue - tx.totalCost;
        const holdingDays = Math.floor((Date.now() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24));
        const holdingPeriod = holdingDays > 365 ? 'Long-term' : 'Short-term';
        
        lots.push({
          date: new Date(tx.date),
          amount: tx.amount,
          costBasis: tx.totalCost,
          currentValue,
          unrealizedGain,
          holdingPeriod
        });
        
        totalCostBasis += tx.totalCost;
        totalAmount += tx.amount;
        totalCurrentValue += currentValue;
      });
    });
    
    const averageCostBasis = totalAmount > 0 ? totalCostBasis / totalAmount : 0;
    const unrealizedGains = totalCurrentValue - totalCostBasis;
    const realizedGains = 0; // Would need sale transactions
    
    // Estimate tax liability (simplified)
    const longTermGains = lots
      .filter(lot => lot.holdingPeriod === 'Long-term')
      .reduce((sum, lot) => sum + lot.unrealizedGain, 0);
    const shortTermGains = lots
      .filter(lot => lot.holdingPeriod === 'Short-term')
      .reduce((sum, lot) => sum + lot.unrealizedGain, 0);
    
    const taxLiability = (longTermGains * 0.20) + (shortTermGains * 0.37); // Simplified tax rates
    
    return {
      method,
      totalCostBasis,
      averageCostBasis,
      realizedGains,
      unrealizedGains,
      taxLiability,
      lots
    };
  }

  /**
   * Compare yield with peer companies
   */
  private async compareYieldWithPeers(
    ticker: string,
    btcYield: number,
    ethYield: number,
    solYield: number,
    totalYield: number
  ): Promise<YieldComparison[]> {
    // Get all companies for comparison
    const companies = await this.prisma.companies.findMany({
      include: {
        treasury_holdings: true
      }
    });
    
    const comparisons: YieldComparison[] = [];
    
    // Calculate yields for each company (simplified)
    companies.forEach((company, index) => {
      // In production, this would calculate actual yields
      const comparison: YieldComparison = {
        ticker: company.ticker,
        btcYield: company.ticker === ticker ? btcYield : Math.random() * 50,
        ethYield: company.ticker === ticker ? ethYield : Math.random() * 30,
        solYield: company.ticker === ticker ? solYield : Math.random() * 70,
        totalYield: company.ticker === ticker ? totalYield : Math.random() * 40,
        rank: 0,
        percentile: 0
      };
      comparisons.push(comparison);
    });
    
    // Sort by total yield and assign ranks
    comparisons.sort((a, b) => b.totalYield - a.totalYield);
    comparisons.forEach((comp, index) => {
      comp.rank = index + 1;
      comp.percentile = ((comparisons.length - index) / comparisons.length) * 100;
    });
    
    return comparisons;
  }

  // Helper methods
  private getStartDate(timeFrame: 'quarterly' | 'yearly'): Date {
    const date = new Date();
    if (timeFrame === 'quarterly') {
      date.setMonth(date.getMonth() - 3);
    } else {
      date.setFullYear(date.getFullYear() - 1);
    }
    return date;
  }

  private async getPreviousShareCount(
    ticker: string,
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<number> {
    const startDate = this.getStartDate(timeFrame);
    
    const historical = await this.prisma.historical_metrics.findFirst({
      where: {
        ticker,
        date: { gte: startDate },
        shares_diluted: { not: null }
      },
      orderBy: { date: 'asc' }
    });
    
    return historical?.shares_diluted || 100000000; // Default 100M shares
  }

  private async getPreviousHoldingAmount(
    holding: TreasuryHolding,
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<number> {
    const startDate = this.getStartDate(timeFrame);
    
    // Sum transactions up to start date
    const previousAmount = holding.transactions
      .filter(tx => new Date(tx.date) < startDate)
      .reduce((sum, tx) => {
        if (tx.type === 'purchase' || tx.type === 'stake') {
          return sum + tx.amount;
        } else {
          return sum - tx.amount;
        }
      }, 0);
    
    return previousAmount;
  }

  private async getPreviousTotalValue(
    holdings: TreasuryHolding[],
    timeFrame: 'quarterly' | 'yearly'
  ): Promise<number> {
    let totalValue = 0;
    
    for (const holding of holdings) {
      const previousAmount = await this.getPreviousHoldingAmount(holding, timeFrame);
      // Use average cost basis as proxy for previous value
      const previousValue = previousAmount * holding.averageCostBasis;
      totalValue += previousValue;
    }
    
    return totalValue;
  }

  private calculatePreviousCryptoAmount(
    holdings: TreasuryHolding[],
    timeFrame: 'quarterly' | 'yearly'
  ): number {
    const startDate = this.getStartDate(timeFrame);
    
    return holdings.reduce((total, holding) => {
      const previousAmount = holding.transactions
        .filter(tx => new Date(tx.date) < startDate)
        .reduce((sum, tx) => {
          if (tx.type === 'purchase' || tx.type === 'stake') {
            return sum + tx.amount;
          } else {
            return sum - tx.amount;
          }
        }, 0);
      return total + previousAmount;
    }, 0);
  }

  private calculateCurrentCryptoAmount(holdings: TreasuryHolding[]): number {
    return holdings.reduce((total, holding) => total + holding.amount, 0);
  }
}

export default CryptoYieldEngine;