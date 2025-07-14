/**
 * Financial Health Scoring Engine
 * Comprehensive financial health assessment for DAT companies
 */

import { Company, CalculatedMetrics } from '@/types';
import { getPrismaClient } from '@/lib/db';

export interface FinancialHealthScore {
  overallScore: number;
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
  components: {
    liquidity: LiquidityHealth;
    solvency: SolvencyHealth;
    efficiency: EfficiencyHealth;
    growth: GrowthHealth;
    treasury: TreasuryHealth;
  };
  strengths: string[];
  weaknesses: string[];
  outlook: 'Positive' | 'Stable' | 'Negative';
  recommendations: string[];
  esgScore?: ESGScore;
}

export interface LiquidityHealth {
  score: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
  cashConversionCycle: number;
  liquidityRating: 'Strong' | 'Adequate' | 'Weak' | 'Critical';
}

export interface SolvencyHealth {
  score: number;
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;
  debtServiceCoverage: number;
  financialLeverage: number;
  solvencyRating: 'Strong' | 'Adequate' | 'Weak' | 'Critical';
}

export interface EfficiencyHealth {
  score: number;
  assetTurnover: number;
  capitalEfficiency: number;
  operatingMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  efficiencyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface GrowthHealth {
  score: number;
  treasuryGrowthRate: number;
  revenueGrowthRate: number;
  navGrowthRate: number;
  shareCountGrowth: number;
  sustainableGrowthRate: number;
  growthRating: 'High' | 'Moderate' | 'Low' | 'Negative';
}

export interface TreasuryHealth {
  score: number;
  treasuryToMarketCap: number;
  treasuryToDebt: number;
  treasuryDiversification: number;
  treasuryQuality: number;
  treasuryEfficiency: number;
  treasuryRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface ESGScore {
  environmental: number;
  social: number;
  governance: number;
  overall: number;
  details: {
    carbonFootprint: 'Low' | 'Medium' | 'High';
    socialImpact: 'Positive' | 'Neutral' | 'Negative';
    governanceQuality: 'Strong' | 'Adequate' | 'Weak';
  };
}

export class FinancialHealthEngine {
  private prisma = getPrismaClient();

  /**
   * Calculate comprehensive financial health score
   */
  async calculateFinancialHealth(
    company: Company,
    metrics: CalculatedMetrics,
    historicalData?: any[]
  ): Promise<FinancialHealthScore> {
    // Calculate component scores
    const liquidity = this.assessLiquidity(company, metrics);
    const solvency = this.assessSolvency(company, metrics);
    const efficiency = this.assessEfficiency(company, metrics);
    const growth = await this.assessGrowth(company, metrics, historicalData);
    const treasury = this.assessTreasuryHealth(company, metrics);
    
    // Calculate overall score (weighted average)
    const overallScore = (
      liquidity.score * 0.20 +
      solvency.score * 0.25 +
      efficiency.score * 0.20 +
      growth.score * 0.15 +
      treasury.score * 0.20
    );
    
    // Determine grade
    const grade = this.calculateGrade(overallScore);
    
    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsWeaknesses({
      liquidity,
      solvency,
      efficiency,
      growth,
      treasury
    });
    
    // Determine outlook
    const outlook = this.determineOutlook(growth, solvency, overallScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      liquidity,
      solvency,
      efficiency,
      growth,
      treasury
    }, weaknesses);
    
    // Calculate ESG score (if applicable)
    const esgScore = this.calculateESGScore(company);
    
    return {
      overallScore,
      grade,
      components: {
        liquidity,
        solvency,
        efficiency,
        growth,
        treasury
      },
      strengths,
      weaknesses,
      outlook,
      recommendations,
      esgScore
    };
  }

  /**
   * Assess liquidity health
   */
  private assessLiquidity(company: Company, metrics: CalculatedMetrics): LiquidityHealth {
    const treasuryValue = metrics.treasuryValue;
    const currentLiabilities = company.totalDebt * 0.3; // Estimate current portion
    const inventory = 0; // DAT companies typically have no inventory
    
    // Calculate liquidity ratios
    const currentRatio = (treasuryValue + company.businessModel.operatingRevenue * 0.25) / currentLiabilities;
    const quickRatio = treasuryValue / currentLiabilities;
    const cashRatio = treasuryValue * 0.9 / currentLiabilities; // 90% of treasury is liquid
    
    // Working capital
    const workingCapital = treasuryValue - currentLiabilities;
    
    // Cash conversion cycle (simplified for DAT companies)
    const cashConversionCycle = 30; // Assume 30 days average
    
    // Score calculation (0-100)
    let score = 0;
    if (currentRatio >= 2) score += 25;
    else if (currentRatio >= 1.5) score += 20;
    else if (currentRatio >= 1) score += 10;
    
    if (quickRatio >= 1.5) score += 25;
    else if (quickRatio >= 1) score += 20;
    else if (quickRatio >= 0.75) score += 10;
    
    if (cashRatio >= 1) score += 25;
    else if (cashRatio >= 0.5) score += 15;
    else if (cashRatio >= 0.25) score += 5;
    
    if (workingCapital > 0) score += 25;
    else if (workingCapital > -treasuryValue * 0.1) score += 10;
    
    // Determine rating
    let liquidityRating: 'Strong' | 'Adequate' | 'Weak' | 'Critical';
    if (score >= 80) liquidityRating = 'Strong';
    else if (score >= 60) liquidityRating = 'Adequate';
    else if (score >= 40) liquidityRating = 'Weak';
    else liquidityRating = 'Critical';
    
    return {
      score,
      currentRatio,
      quickRatio,
      cashRatio,
      workingCapital,
      cashConversionCycle,
      liquidityRating
    };
  }

  /**
   * Assess solvency health
   */
  private assessSolvency(company: Company, metrics: CalculatedMetrics): SolvencyHealth {
    const treasuryValue = metrics.treasuryValue;
    const totalAssets = treasuryValue + company.shareholdersEquity;
    const operatingIncome = company.businessModel.operatingRevenue - company.businessModel.operatingExpenses;
    
    // Calculate solvency ratios
    const debtToEquity = company.totalDebt / company.shareholdersEquity;
    const debtToAssets = company.totalDebt / totalAssets;
    
    // Coverage ratios
    const annualInterest = company.totalDebt * 0.05; // Assume 5% average rate
    const interestCoverage = operatingIncome > 0 ? operatingIncome / annualInterest : 0;
    const debtServiceCoverage = (operatingIncome + treasuryValue * 0.1) / annualInterest;
    
    // Financial leverage
    const financialLeverage = totalAssets / company.shareholdersEquity;
    
    // Score calculation
    let score = 0;
    
    if (debtToEquity < 0.5) score += 25;
    else if (debtToEquity < 1) score += 15;
    else if (debtToEquity < 2) score += 5;
    
    if (debtToAssets < 0.3) score += 25;
    else if (debtToAssets < 0.5) score += 15;
    else if (debtToAssets < 0.7) score += 5;
    
    if (interestCoverage > 5) score += 25;
    else if (interestCoverage > 3) score += 15;
    else if (interestCoverage > 1.5) score += 5;
    
    if (financialLeverage < 2) score += 25;
    else if (financialLeverage < 3) score += 15;
    else if (financialLeverage < 4) score += 5;
    
    // Determine rating
    let solvencyRating: 'Strong' | 'Adequate' | 'Weak' | 'Critical';
    if (score >= 80) solvencyRating = 'Strong';
    else if (score >= 60) solvencyRating = 'Adequate';
    else if (score >= 40) solvencyRating = 'Weak';
    else solvencyRating = 'Critical';
    
    return {
      score,
      debtToEquity,
      debtToAssets,
      interestCoverage,
      debtServiceCoverage,
      financialLeverage,
      solvencyRating
    };
  }

  /**
   * Assess operational efficiency
   */
  private assessEfficiency(company: Company, metrics: CalculatedMetrics): EfficiencyHealth {
    const totalAssets = metrics.treasuryValue + company.shareholdersEquity;
    const operatingIncome = company.businessModel.operatingRevenue - company.businessModel.operatingExpenses;
    
    // Calculate efficiency ratios
    const assetTurnover = company.businessModel.operatingRevenue / totalAssets;
    const capitalEfficiency = metrics.capitalEfficiency.capitalAllocationScore;
    const operatingMargin = company.businessModel.operatingRevenue > 0 ? 
      operatingIncome / company.businessModel.operatingRevenue : -1;
    const returnOnAssets = operatingIncome / totalAssets;
    const returnOnEquity = operatingIncome / company.shareholdersEquity;
    
    // Score calculation
    let score = 0;
    
    if (assetTurnover > 0.5) score += 20;
    else if (assetTurnover > 0.3) score += 10;
    else if (assetTurnover > 0.1) score += 5;
    
    score += capitalEfficiency * 0.3; // Direct use of capital efficiency score
    
    if (operatingMargin > 0.2) score += 20;
    else if (operatingMargin > 0) score += 10;
    else if (operatingMargin > -0.2) score += 5;
    
    if (returnOnAssets > 0.1) score += 15;
    else if (returnOnAssets > 0) score += 10;
    else if (returnOnAssets > -0.1) score += 5;
    
    if (returnOnEquity > 0.15) score += 15;
    else if (returnOnEquity > 0) score += 10;
    else if (returnOnEquity > -0.15) score += 5;
    
    // Determine rating
    let efficiencyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (score >= 80) efficiencyRating = 'Excellent';
    else if (score >= 60) efficiencyRating = 'Good';
    else if (score >= 40) efficiencyRating = 'Fair';
    else efficiencyRating = 'Poor';
    
    return {
      score,
      assetTurnover,
      capitalEfficiency,
      operatingMargin,
      returnOnAssets,
      returnOnEquity,
      efficiencyRating
    };
  }

  /**
   * Assess growth health
   */
  private async assessGrowth(
    company: Company,
    metrics: CalculatedMetrics,
    historicalData?: any[]
  ): Promise<GrowthHealth> {
    // Use metrics data for growth rates
    const treasuryGrowthRate = metrics.dilutionMetrics.treasuryAccretionRate;
    const shareCountGrowth = metrics.dilutionMetrics.shareCountGrowth;
    
    // Estimate other growth rates
    const revenueGrowthRate = 20; // Placeholder - would calculate from historical
    const navGrowthRate = treasuryGrowthRate * 0.8; // Conservative estimate
    
    // Sustainable growth rate (ROE * retention ratio)
    const roe = 0.1; // Placeholder
    const retentionRatio = 0.8; // Assume 80% retention
    const sustainableGrowthRate = roe * retentionRatio * 100;
    
    // Score calculation
    let score = 0;
    
    if (treasuryGrowthRate > 50) score += 30;
    else if (treasuryGrowthRate > 25) score += 20;
    else if (treasuryGrowthRate > 10) score += 10;
    else if (treasuryGrowthRate > 0) score += 5;
    
    if (shareCountGrowth < 5) score += 20;
    else if (shareCountGrowth < 10) score += 10;
    else if (shareCountGrowth < 20) score += 5;
    
    if (navGrowthRate > 30) score += 25;
    else if (navGrowthRate > 15) score += 15;
    else if (navGrowthRate > 5) score += 5;
    
    if (sustainableGrowthRate > 10) score += 25;
    else if (sustainableGrowthRate > 5) score += 15;
    else if (sustainableGrowthRate > 0) score += 5;
    
    // Determine rating
    let growthRating: 'High' | 'Moderate' | 'Low' | 'Negative';
    if (score >= 80) growthRating = 'High';
    else if (score >= 60) growthRating = 'Moderate';
    else if (score >= 40) growthRating = 'Low';
    else growthRating = 'Negative';
    
    return {
      score,
      treasuryGrowthRate,
      revenueGrowthRate,
      navGrowthRate,
      shareCountGrowth,
      sustainableGrowthRate,
      growthRating
    };
  }

  /**
   * Assess treasury health
   */
  private assessTreasuryHealth(company: Company, metrics: CalculatedMetrics): TreasuryHealth {
    const treasuryValue = metrics.treasuryValue;
    
    // Calculate treasury metrics
    const treasuryToMarketCap = treasuryValue / company.marketCap;
    const treasuryToDebt = treasuryValue / company.totalDebt;
    
    // Diversification score (based on concentration)
    const herfindahlIndex = Object.values(metrics.treasuryConcentration).reduce((sum, pct) => {
      const share = (pct || 0) / 100;
      return sum + share * share;
    }, 0);
    const treasuryDiversification = (1 - herfindahlIndex) * 100;
    
    // Quality score (BTC > ETH > SOL in terms of liquidity/stability)
    const btcWeight = (metrics.treasuryConcentration.BTC || 0) / 100;
    const ethWeight = (metrics.treasuryConcentration.ETH || 0) / 100;
    const solWeight = (metrics.treasuryConcentration.SOL || 0) / 100;
    const treasuryQuality = btcWeight * 95 + ethWeight * 85 + solWeight * 70;
    
    // Efficiency from metrics
    const treasuryEfficiency = metrics.capitalEfficiency.treasuryROI;
    
    // Score calculation
    let score = 0;
    
    if (treasuryToMarketCap > 0.8) score += 25;
    else if (treasuryToMarketCap > 0.6) score += 20;
    else if (treasuryToMarketCap > 0.4) score += 10;
    
    if (treasuryToDebt > 3) score += 25;
    else if (treasuryToDebt > 2) score += 20;
    else if (treasuryToDebt > 1) score += 10;
    
    score += treasuryDiversification * 0.15;
    score += treasuryQuality * 0.20;
    
    if (treasuryEfficiency > 50) score += 15;
    else if (treasuryEfficiency > 25) score += 10;
    else if (treasuryEfficiency > 0) score += 5;
    
    // Determine rating
    let treasuryRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (score >= 80) treasuryRating = 'Excellent';
    else if (score >= 60) treasuryRating = 'Good';
    else if (score >= 40) treasuryRating = 'Fair';
    else treasuryRating = 'Poor';
    
    return {
      score,
      treasuryToMarketCap,
      treasuryToDebt,
      treasuryDiversification,
      treasuryQuality,
      treasuryEfficiency,
      treasuryRating
    };
  }

  /**
   * Calculate ESG score
   */
  private calculateESGScore(company: Company): ESGScore {
    // Environmental score (energy efficiency of holdings)
    const btcWeight = company.treasury.find(h => h.crypto === 'BTC') ? 0.3 : 0;
    const ethWeight = company.treasury.find(h => h.crypto === 'ETH') ? 0.7 : 0; // PoS is better
    const solWeight = company.treasury.find(h => h.crypto === 'SOL') ? 0.6 : 0;
    const environmental = 50 + (ethWeight * 30 + solWeight * 20 - btcWeight * 20);
    
    // Social score (based on business model)
    const social = company.businessModel.isTreasuryFocused ? 50 : 60;
    
    // Governance score
    const independentRatio = company.governance.independentDirectors / company.governance.boardSize;
    const governance = 40 + independentRatio * 40 + (company.governance.ceoFounder ? -10 : 10);
    
    const overall = (environmental + social + governance) / 3;
    
    return {
      environmental,
      social,
      governance,
      overall,
      details: {
        carbonFootprint: environmental > 70 ? 'Low' : environmental > 50 ? 'Medium' : 'High',
        socialImpact: social > 60 ? 'Positive' : social > 40 ? 'Neutral' : 'Negative',
        governanceQuality: governance > 70 ? 'Strong' : governance > 50 ? 'Adequate' : 'Weak'
      }
    };
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): FinancialHealthScore['grade'] {
    if (score >= 93) return 'A+';
    if (score >= 87) return 'A';
    if (score >= 83) return 'A-';
    if (score >= 77) return 'B+';
    if (score >= 73) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 67) return 'C+';
    if (score >= 63) return 'C';
    if (score >= 60) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Identify strengths and weaknesses
   */
  private identifyStrengthsWeaknesses(components: any): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    // Liquidity
    if (components.liquidity.score >= 80) {
      strengths.push('Strong liquidity position with ample cash reserves');
    } else if (components.liquidity.score < 50) {
      weaknesses.push('Weak liquidity may pose short-term funding risks');
    }
    
    // Solvency
    if (components.solvency.score >= 80) {
      strengths.push('Low leverage and strong debt coverage');
    } else if (components.solvency.score < 50) {
      weaknesses.push('High debt levels create solvency concerns');
    }
    
    // Efficiency
    if (components.efficiency.score >= 80) {
      strengths.push('Excellent operational efficiency and capital allocation');
    } else if (components.efficiency.score < 50) {
      weaknesses.push('Poor operational efficiency impacts returns');
    }
    
    // Growth
    if (components.growth.score >= 80) {
      strengths.push('Strong growth trajectory with controlled dilution');
    } else if (components.growth.score < 50) {
      weaknesses.push('Limited growth potential or excessive dilution');
    }
    
    // Treasury
    if (components.treasury.score >= 80) {
      strengths.push('High-quality, diversified treasury portfolio');
    } else if (components.treasury.score < 50) {
      weaknesses.push('Treasury concentration or quality concerns');
    }
    
    return { strengths, weaknesses };
  }

  /**
   * Determine outlook based on trends
   */
  private determineOutlook(
    growth: GrowthHealth,
    solvency: SolvencyHealth,
    overallScore: number
  ): 'Positive' | 'Stable' | 'Negative' {
    if (growth.growthRating === 'High' && solvency.solvencyRating !== 'Critical') {
      return 'Positive';
    }
    if (growth.growthRating === 'Negative' || solvency.solvencyRating === 'Critical') {
      return 'Negative';
    }
    if (overallScore >= 70 && (growth.growthRating === 'High' || growth.growthRating === 'Moderate' || growth.growthRating === 'Low')) {
      return 'Positive';
    }
    if (overallScore < 50) {
      return 'Negative';
    }
    return 'Stable';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    components: any,
    weaknesses: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Liquidity recommendations
    if (components.liquidity.score < 60) {
      recommendations.push('Improve liquidity by reducing short-term debt or liquidating non-core assets');
    }
    
    // Solvency recommendations
    if (components.solvency.debtToEquity > 1.5) {
      recommendations.push('Consider debt reduction through equity raises or asset sales');
    }
    
    // Efficiency recommendations
    if (components.efficiency.operatingMargin < 0) {
      recommendations.push('Focus on achieving operational profitability through cost reduction');
    }
    
    // Growth recommendations
    if (components.growth.shareCountGrowth > 20) {
      recommendations.push('Implement more disciplined capital allocation to reduce dilution');
    }
    
    // Treasury recommendations
    if (components.treasury.treasuryDiversification < 50) {
      recommendations.push('Diversify treasury holdings to reduce concentration risk');
    }
    
    // Add specific recommendations based on weaknesses
    if (weaknesses.length > 2) {
      recommendations.push('Develop comprehensive turnaround plan addressing multiple weaknesses');
    }
    
    return recommendations;
  }
}

export default FinancialHealthEngine;