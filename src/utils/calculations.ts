// Utility functions for financial calculations in DAT Analytics Platform

import { Company, TreasuryHolding, FinancialMetrics } from '../types/models';

// Calculate Net Asset Value (NAV) per share
export function calculateNavPerShare(
  shareholdersEquity: number,
  totalTreasuryValue: number,
  sharesOutstanding: number
): number {
  if (sharesOutstanding === 0) return 0;
  const netAssetValue = shareholdersEquity + totalTreasuryValue;
  return netAssetValue / sharesOutstanding;
}

// Calculate Premium to NAV
export function calculatePremiumToNav(
  currentPrice: number,
  navPerShare: number
): { premium: number; premiumPercent: number } {
  if (navPerShare === 0) {
    return { premium: 0, premiumPercent: 0 };
  }
  
  const premium = currentPrice - navPerShare;
  const premiumPercent = (premium / navPerShare) * 100;
  
  return { premium, premiumPercent };
}

// Calculate total treasury value
export function calculateTotalTreasuryValue(
  holdings: TreasuryHolding[],
  cryptoPrices: Record<string, number>
): number {
  return holdings.reduce((total, holding) => {
    const price = cryptoPrices[holding.cryptoType] || 0;
    return total + (holding.amount * price);
  }, 0);
}

// Calculate treasury value per share
export function calculateTreasuryValuePerShare(
  totalTreasuryValue: number,
  sharesOutstanding: number
): number {
  if (sharesOutstanding === 0) return 0;
  return totalTreasuryValue / sharesOutstanding;
}

// Calculate unrealized gain/loss for a holding
export function calculateUnrealizedGainLoss(
  amount: number,
  currentPrice: number,
  costBasis: number
): { value: number; percent: number } {
  const currentValue = amount * currentPrice;
  const gainLoss = currentValue - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
  
  return { value: gainLoss, percent: gainLossPercent };
}

// Calculate enterprise value to treasury ratio
export function calculateEVToTreasury(
  enterpriseValue: number,
  totalTreasuryValue: number
): number {
  if (totalTreasuryValue === 0) return Infinity;
  return enterpriseValue / totalTreasuryValue;
}

// Calculate treasury as percentage of market cap
export function calculateTreasuryToMarketCap(
  totalTreasuryValue: number,
  marketCap: number
): number {
  if (marketCap === 0) return 0;
  return (totalTreasuryValue / marketCap) * 100;
}

// Calculate weighted average purchase price
export function calculateWeightedAveragePrice(
  transactions: Array<{ amount: number; price: number }>
): number {
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  if (totalAmount === 0) return 0;
  
  const weightedSum = transactions.reduce(
    (sum, tx) => sum + (tx.amount * tx.price),
    0
  );
  
  return weightedSum / totalAmount;
}

// Calculate portfolio diversification metrics
export function calculateDiversificationMetrics(holdings: TreasuryHolding[]): {
  numberOfAssets: number;
  largestPosition: number;
  herfindahlIndex: number;
  isConcentrated: boolean;
} {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalValue === 0) {
    return {
      numberOfAssets: 0,
      largestPosition: 0,
      herfindahlIndex: 0,
      isConcentrated: true
    };
  }
  
  const positions = holdings.map(h => h.currentValue / totalValue);
  const largestPosition = Math.max(...positions) * 100;
  
  // Herfindahl-Hirschman Index (HHI) for concentration
  const herfindahlIndex = positions.reduce((sum, p) => sum + Math.pow(p * 100, 2), 0);
  
  return {
    numberOfAssets: holdings.length,
    largestPosition,
    herfindahlIndex,
    isConcentrated: herfindahlIndex > 2500 || largestPosition > 50
  };
}

// Format large numbers with appropriate suffixes
export function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  
  return value.toFixed(2);
}

// Calculate annualized return
export function calculateAnnualizedReturn(
  startValue: number,
  endValue: number,
  days: number
): number {
  if (startValue === 0 || days === 0) return 0;
  
  const totalReturn = (endValue - startValue) / startValue;
  const yearsHeld = days / 365;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / yearsHeld) - 1;
  
  return annualizedReturn * 100;
}

// Calculate Sharpe ratio (simplified version)
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% annual risk-free rate
): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - (riskFreeRate / 12); // Monthly risk-free rate
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  return (excessReturn / stdDev) * Math.sqrt(12); // Annualized
}

// Calculate price momentum
export function calculateMomentum(
  priceHistory: Array<{ date: Date; price: number }>,
  periods: number = 20
): number {
  if (priceHistory.length < periods + 1) return 0;
  
  const recentPrices = priceHistory.slice(-periods - 1);
  const startPrice = recentPrices[0].price;
  const endPrice = recentPrices[recentPrices.length - 1].price;
  
  if (startPrice === 0) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

// Validate financial metrics
export function validateFinancialMetrics(metrics: FinancialMetrics): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (metrics.marketCap < 0) errors.push('Market cap cannot be negative');
  if (metrics.sharesOutstanding <= 0) errors.push('Shares outstanding must be positive');
  if (metrics.totalAssets < metrics.totalLiabilities) {
    errors.push('Total assets should be greater than or equal to total liabilities');
  }
  
  const calculatedEquity = metrics.totalAssets - metrics.totalLiabilities;
  const equityDifference = Math.abs(calculatedEquity - metrics.shareholdersEquity);
  
  if (equityDifference > 1000) {
    errors.push('Shareholders equity does not match assets minus liabilities');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}