/**
 * Dilution Analysis Engine
 * Advanced dilution calculations and scenario modeling
 */

import { Company, ConvertibleDebt, Warrant, ExecutiveCompensation } from '@/types';
import { getPrismaClient } from '@/lib/db';

export interface DilutionAnalysis {
  currentDilution: DilutionSnapshot;
  projectedDilution: DilutionProjection[];
  conversionScenarios: ConversionScenario[];
  warrantAnalysis: WarrantAnalysis;
  compensationDilution: CompensationDilution;
  whatIfScenarios: WhatIfScenario[];
  dilutionWaterfall: DilutionWaterfall;
}

export interface DilutionSnapshot {
  basicShares: number;
  dilutedShares: number;
  assumedDilutedShares: number;
  totalPotentialDilution: number;
  dilutionPercent: number;
  breakdown: {
    convertibleDebt: number;
    warrants: number;
    stockOptions: number;
    restrictedStock: number;
    performanceUnits: number;
  };
}

export interface DilutionProjection {
  timeHorizon: string;
  projectedShares: number;
  dilutionFromCurrent: number;
  dilutionPercent: number;
  assumptions: string[];
  probability: number;
}

export interface ConversionScenario {
  debtInstrument: string;
  conversionPrice: number;
  currentStockPrice: number;
  inTheMoney: boolean;
  conversionProbability: number;
  sharesOnConversion: number;
  dilutionImpact: number;
  interestSavings: number;
  epsImpact: number;
}

export interface WarrantAnalysis {
  totalWarrantsOutstanding: number;
  weightedAverageStrike: number;
  totalPotentialShares: number;
  moneyness: Array<{
    strikePrice: number;
    warrantCount: number;
    sharesIfExercised: number;
    inTheMoney: boolean;
    intrinsicValue: number;
  }>;
  blackScholesValue: number;
  expectedDilution: number;
}

export interface CompensationDilution {
  annualEquityGrants: number;
  vestingSchedule: Array<{
    year: number;
    sharesVesting: number;
    cumulativeVested: number;
  }>;
  burnRate: number;
  overhang: number;
  dilutionFromComp: number;
  peerComparison: {
    medianBurnRate: number;
    percentileRank: number;
  };
}

export interface WhatIfScenario {
  name: string;
  description: string;
  assumptions: {
    stockPrice?: number;
    newDebtIssuance?: number;
    newEquityRaise?: number;
    acquisitionShares?: number;
  };
  resultingShares: number;
  dilutionPercent: number;
  navPerShareImpact: number;
  epsImpact: number;
}

export interface DilutionWaterfall {
  startingShares: number;
  steps: Array<{
    description: string;
    sharesAdded: number;
    cumulativeShares: number;
    dilutionPercent: number;
  }>;
  endingShares: number;
  totalDilution: number;
}

export class DilutionEngine {
  private prisma = getPrismaClient();

  /**
   * Perform comprehensive dilution analysis
   */
  async analyzeDilution(
    company: Company,
    currentStockPrice: number
  ): Promise<DilutionAnalysis> {
    // Current dilution snapshot
    const currentDilution = this.calculateCurrentDilution(company);
    
    // Projected dilution over time
    const projectedDilution = this.projectFutureDilution(company);
    
    // Convertible debt scenarios
    const conversionScenarios = this.analyzeConversionScenarios(
      company.capitalStructure.convertibleDebt,
      currentStockPrice,
      company.sharesOutstanding
    );
    
    // Warrant analysis
    const warrantAnalysis = this.analyzeWarrants(
      company.capitalStructure.warrants,
      currentStockPrice
    );
    
    // Compensation dilution
    const compensationDilution = await this.analyzeCompensationDilution(
      company
    );
    
    // What-if scenarios
    const whatIfScenarios = this.generateWhatIfScenarios(
      company,
      currentStockPrice
    );
    
    // Dilution waterfall
    const dilutionWaterfall = this.createDilutionWaterfall(company);
    
    return {
      currentDilution,
      projectedDilution,
      conversionScenarios,
      warrantAnalysis,
      compensationDilution,
      whatIfScenarios,
      dilutionWaterfall
    };
  }

  /**
   * Calculate current dilution snapshot
   */
  private calculateCurrentDilution(company: Company): DilutionSnapshot {
    const { capitalStructure } = company;
    const basicShares = capitalStructure.sharesBasic;
    const dilutedShares = capitalStructure.sharesDilutedCurrent;
    
    // Calculate assumed diluted shares
    let convertibleDebtShares = 0;
    capitalStructure.convertibleDebt.forEach(debt => {
      if (debt.isOutstanding && debt.conversionPrice > 0) {
        convertibleDebtShares += debt.principal / debt.conversionPrice;
      }
    });
    
    let warrantShares = 0;
    capitalStructure.warrants.forEach(warrant => {
      if (warrant.isOutstanding) {
        warrantShares += warrant.totalWarrants * warrant.sharesPerWarrant;
      }
    });
    
    const stockOptions = capitalStructure.stockOptions;
    const restrictedStock = capitalStructure.restrictedStockUnits;
    const performanceUnits = capitalStructure.performanceStockUnits;
    
    const assumedDilutedShares = basicShares + convertibleDebtShares + 
                                warrantShares + stockOptions + 
                                restrictedStock + performanceUnits;
    
    const totalPotentialDilution = assumedDilutedShares - basicShares;
    const dilutionPercent = (totalPotentialDilution / basicShares) * 100;
    
    return {
      basicShares,
      dilutedShares,
      assumedDilutedShares,
      totalPotentialDilution,
      dilutionPercent,
      breakdown: {
        convertibleDebt: convertibleDebtShares,
        warrants: warrantShares,
        stockOptions,
        restrictedStock,
        performanceUnits
      }
    };
  }

  /**
   * Project future dilution
   */
  private projectFutureDilution(company: Company): DilutionProjection[] {
    const projections: DilutionProjection[] = [];
    const currentShares = company.capitalStructure.sharesBasic;
    
    // 1 Year projection
    const yearOneShares = currentShares * 1.05; // Assume 5% annual dilution
    projections.push({
      timeHorizon: '1 Year',
      projectedShares: yearOneShares,
      dilutionFromCurrent: yearOneShares - currentShares,
      dilutionPercent: ((yearOneShares - currentShares) / currentShares) * 100,
      assumptions: [
        '5% annual equity compensation dilution',
        'No debt conversions',
        'No new capital raises'
      ],
      probability: 0.7
    });
    
    // 3 Year projection
    const yearThreeShares = currentShares * Math.pow(1.05, 3);
    projections.push({
      timeHorizon: '3 Years',
      projectedShares: yearThreeShares,
      dilutionFromCurrent: yearThreeShares - currentShares,
      dilutionPercent: ((yearThreeShares - currentShares) / currentShares) * 100,
      assumptions: [
        '5% annual equity compensation dilution',
        '50% of convertible debt converts',
        'One equity raise of $500M'
      ],
      probability: 0.5
    });
    
    // 5 Year projection - aggressive scenario
    const yearFiveShares = currentShares * 1.5; // 50% dilution over 5 years
    projections.push({
      timeHorizon: '5 Years',
      projectedShares: yearFiveShares,
      dilutionFromCurrent: yearFiveShares - currentShares,
      dilutionPercent: ((yearFiveShares - currentShares) / currentShares) * 100,
      assumptions: [
        'Aggressive treasury expansion',
        'All convertibles convert',
        'Multiple equity raises',
        'High equity compensation'
      ],
      probability: 0.3
    });
    
    return projections;
  }

  /**
   * Analyze convertible debt conversion scenarios
   */
  private analyzeConversionScenarios(
    convertibleDebts: ConvertibleDebt[],
    currentStockPrice: number,
    currentShares: number
  ): ConversionScenario[] {
    return convertibleDebts
      .filter(debt => debt.isOutstanding)
      .map(debt => {
        const inTheMoney = currentStockPrice > debt.conversionPrice;
        const moneyness = (currentStockPrice - debt.conversionPrice) / debt.conversionPrice;
        
        // Estimate conversion probability
        let conversionProbability = 0;
        if (moneyness > 0.5) conversionProbability = 0.95;
        else if (moneyness > 0.2) conversionProbability = 0.7;
        else if (moneyness > 0) conversionProbability = 0.4;
        else if (moneyness > -0.1) conversionProbability = 0.2;
        else conversionProbability = 0.05;
        
        const sharesOnConversion = debt.principal / debt.conversionPrice;
        const dilutionImpact = (sharesOnConversion / currentShares) * 100;
        const interestSavings = debt.principal * debt.interestRate;
        
        // Simplified EPS impact
        const epsImpact = -dilutionImpact * 0.8; // Assume 80% of dilution flows to EPS
        
        return {
          debtInstrument: `${debt.principal / 1000000}M @ ${debt.interestRate}%`,
          conversionPrice: debt.conversionPrice,
          currentStockPrice,
          inTheMoney,
          conversionProbability,
          sharesOnConversion,
          dilutionImpact,
          interestSavings,
          epsImpact
        };
      });
  }

  /**
   * Analyze warrant dilution
   */
  private analyzeWarrants(
    warrants: Warrant[],
    currentStockPrice: number
  ): WarrantAnalysis {
    let totalWarrantsOutstanding = 0;
    let weightedStrikeSum = 0;
    let totalPotentialShares = 0;
    let blackScholesValue = 0;
    
    const moneyness = warrants
      .filter(w => w.isOutstanding)
      .map(warrant => {
        const warrantCount = warrant.totalWarrants;
        const sharesIfExercised = warrantCount * warrant.sharesPerWarrant;
        const inTheMoney = currentStockPrice > warrant.strikePrice;
        const intrinsicValue = Math.max(0, currentStockPrice - warrant.strikePrice) * sharesIfExercised;
        
        totalWarrantsOutstanding += warrantCount;
        weightedStrikeSum += warrant.strikePrice * warrantCount;
        totalPotentialShares += sharesIfExercised;
        
        // Simplified Black-Scholes calculation
        if (inTheMoney) {
          const timeToExpiry = Math.max(0, 
            (new Date(warrant.expirationDate).getTime() - Date.now()) / 
            (365 * 24 * 60 * 60 * 1000)
          );
          const volatility = 0.6; // Assumed 60% volatility
          const riskFreeRate = 0.04; // 4% risk-free rate
          
          // Very simplified BS approximation
          const timeValue = currentStockPrice * volatility * Math.sqrt(timeToExpiry) * 0.4;
          blackScholesValue += (intrinsicValue + timeValue * sharesIfExercised);
        }
        
        return {
          strikePrice: warrant.strikePrice,
          warrantCount,
          sharesIfExercised,
          inTheMoney,
          intrinsicValue
        };
      });
    
    const weightedAverageStrike = totalWarrantsOutstanding > 0 ? 
      weightedStrikeSum / totalWarrantsOutstanding : 0;
    
    // Expected dilution based on moneyness
    const expectedDilution = moneyness.reduce((sum, m) => {
      if (m.inTheMoney) {
        const exerciseProbability = Math.min(1, (currentStockPrice - m.strikePrice) / m.strikePrice);
        return sum + m.sharesIfExercised * exerciseProbability;
      }
      return sum;
    }, 0);
    
    return {
      totalWarrantsOutstanding,
      weightedAverageStrike,
      totalPotentialShares,
      moneyness,
      blackScholesValue,
      expectedDilution
    };
  }

  /**
   * Analyze compensation-related dilution
   */
  private async analyzeCompensationDilution(
    company: Company
  ): Promise<CompensationDilution> {
    const { capitalStructure } = company;
    const totalEquityComp = capitalStructure.stockOptions + 
                          capitalStructure.restrictedStockUnits + 
                          capitalStructure.performanceStockUnits;
    
    // Annual grants (estimate as 20% of total outstanding)
    const annualEquityGrants = totalEquityComp * 0.2;
    
    // Vesting schedule (typical 4-year vest)
    const vestingSchedule = [
      { year: 1, sharesVesting: annualEquityGrants * 0.25, cumulativeVested: annualEquityGrants * 0.25 },
      { year: 2, sharesVesting: annualEquityGrants * 0.25, cumulativeVested: annualEquityGrants * 0.50 },
      { year: 3, sharesVesting: annualEquityGrants * 0.25, cumulativeVested: annualEquityGrants * 0.75 },
      { year: 4, sharesVesting: annualEquityGrants * 0.25, cumulativeVested: annualEquityGrants * 1.00 }
    ];
    
    // Burn rate (annual grants / shares outstanding)
    const burnRate = (annualEquityGrants / capitalStructure.sharesBasic) * 100;
    
    // Overhang (total equity comp / shares outstanding)
    const overhang = (totalEquityComp / capitalStructure.sharesBasic) * 100;
    
    // Total dilution from compensation
    const dilutionFromComp = overhang;
    
    // Peer comparison (mock data - would query peer companies)
    const peerComparison = {
      medianBurnRate: 2.5,
      percentileRank: burnRate > 2.5 ? 75 : 25
    };
    
    return {
      annualEquityGrants,
      vestingSchedule,
      burnRate,
      overhang,
      dilutionFromComp,
      peerComparison
    };
  }

  /**
   * Generate what-if dilution scenarios
   */
  private generateWhatIfScenarios(
    company: Company,
    currentStockPrice: number
  ): WhatIfScenario[] {
    const scenarios: WhatIfScenario[] = [];
    const currentShares = company.capitalStructure.sharesBasic;
    const currentNAV = (company.shareholdersEquity + 
                      company.treasury.reduce((sum, h) => sum + h.currentValue, 0)) / 
                      currentShares;
    
    // Scenario 1: Stock price doubles
    const doublePriceShares = currentShares + 
      this.calculateWarrantDilutionAtPrice(company, currentStockPrice * 2);
    scenarios.push({
      name: 'Stock Price Doubles',
      description: 'All in-the-money warrants and convertibles exercise',
      assumptions: { stockPrice: currentStockPrice * 2 },
      resultingShares: doublePriceShares,
      dilutionPercent: ((doublePriceShares - currentShares) / currentShares) * 100,
      navPerShareImpact: -((doublePriceShares - currentShares) / currentShares) * 100,
      epsImpact: -((doublePriceShares - currentShares) / currentShares) * 80
    });
    
    // Scenario 2: Large equity raise
    const equityRaiseAmount = 1000000000; // $1B
    const equityRaiseShares = equityRaiseAmount / currentStockPrice;
    const postRaiseShares = currentShares + equityRaiseShares;
    scenarios.push({
      name: '$1B Equity Raise',
      description: 'Company raises $1B through stock issuance',
      assumptions: { newEquityRaise: equityRaiseAmount },
      resultingShares: postRaiseShares,
      dilutionPercent: ((postRaiseShares - currentShares) / currentShares) * 100,
      navPerShareImpact: ((equityRaiseAmount / postRaiseShares) - currentNAV) / currentNAV * 100,
      epsImpact: -((postRaiseShares - currentShares) / currentShares) * 100
    });
    
    // Scenario 3: Major acquisition
    const acquisitionShares = currentShares * 0.2; // 20% dilution
    const postAcquisitionShares = currentShares + acquisitionShares;
    scenarios.push({
      name: 'Major Stock Acquisition',
      description: 'Company acquires another firm using 20% stock dilution',
      assumptions: { acquisitionShares },
      resultingShares: postAcquisitionShares,
      dilutionPercent: ((postAcquisitionShares - currentShares) / currentShares) * 100,
      navPerShareImpact: -15, // Assume some value creation
      epsImpact: -10 // Assume accretive after synergies
    });
    
    // Scenario 4: Convertible debt issuance
    const newDebtAmount = 500000000; // $500M
    const conversionPrice = currentStockPrice * 1.3; // 30% premium
    const potentialShares = newDebtAmount / conversionPrice;
    scenarios.push({
      name: '$500M Convertible Issuance',
      description: 'New convertible debt with 30% conversion premium',
      assumptions: { newDebtIssuance: newDebtAmount },
      resultingShares: currentShares + potentialShares,
      dilutionPercent: (potentialShares / currentShares) * 100,
      navPerShareImpact: 0, // No immediate impact
      epsImpact: -2 // Interest expense impact
    });
    
    return scenarios;
  }

  /**
   * Create dilution waterfall visualization data
   */
  private createDilutionWaterfall(company: Company): DilutionWaterfall {
    const { capitalStructure } = company;
    const steps: Array<{
      description: string;
      sharesAdded: number;
      cumulativeShares: number;
      dilutionPercent: number;
    }> = [];
    
    let cumulativeShares = capitalStructure.sharesBasic;
    const startingShares = cumulativeShares;
    
    // Step 1: Stock options
    if (capitalStructure.stockOptions > 0) {
      cumulativeShares += capitalStructure.stockOptions;
      steps.push({
        description: 'Stock Options',
        sharesAdded: capitalStructure.stockOptions,
        cumulativeShares,
        dilutionPercent: ((cumulativeShares - startingShares) / startingShares) * 100
      });
    }
    
    // Step 2: RSUs
    if (capitalStructure.restrictedStockUnits > 0) {
      cumulativeShares += capitalStructure.restrictedStockUnits;
      steps.push({
        description: 'Restricted Stock Units',
        sharesAdded: capitalStructure.restrictedStockUnits,
        cumulativeShares,
        dilutionPercent: ((cumulativeShares - startingShares) / startingShares) * 100
      });
    }
    
    // Step 3: Performance units
    if (capitalStructure.performanceStockUnits > 0) {
      cumulativeShares += capitalStructure.performanceStockUnits;
      steps.push({
        description: 'Performance Stock Units',
        sharesAdded: capitalStructure.performanceStockUnits,
        cumulativeShares,
        dilutionPercent: ((cumulativeShares - startingShares) / startingShares) * 100
      });
    }
    
    // Step 4: Warrants
    const warrantShares = capitalStructure.warrants
      .filter(w => w.isOutstanding)
      .reduce((sum, w) => sum + w.totalWarrants * w.sharesPerWarrant, 0);
    
    if (warrantShares > 0) {
      cumulativeShares += warrantShares;
      steps.push({
        description: 'Warrants',
        sharesAdded: warrantShares,
        cumulativeShares,
        dilutionPercent: ((cumulativeShares - startingShares) / startingShares) * 100
      });
    }
    
    // Step 5: Convertible debt
    const convertibleShares = capitalStructure.convertibleDebt
      .filter(d => d.isOutstanding)
      .reduce((sum, d) => sum + (d.principal / d.conversionPrice), 0);
    
    if (convertibleShares > 0) {
      cumulativeShares += convertibleShares;
      steps.push({
        description: 'Convertible Debt',
        sharesAdded: convertibleShares,
        cumulativeShares,
        dilutionPercent: ((cumulativeShares - startingShares) / startingShares) * 100
      });
    }
    
    return {
      startingShares,
      steps,
      endingShares: cumulativeShares,
      totalDilution: ((cumulativeShares - startingShares) / startingShares) * 100
    };
  }

  /**
   * Helper method to calculate warrant dilution at a given price
   */
  private calculateWarrantDilutionAtPrice(
    company: Company,
    stockPrice: number
  ): number {
    return company.capitalStructure.warrants
      .filter(w => w.isOutstanding && stockPrice > w.strikePrice)
      .reduce((sum, w) => sum + w.totalWarrants * w.sharesPerWarrant, 0);
  }
}

export default DilutionEngine;