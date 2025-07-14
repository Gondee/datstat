import { NextRequest, NextResponse } from 'next/server';
import { getCompanyByTicker } from '@/lib/database-utils';
import { CompanyWithRelations } from '@/lib/database-utils';
import { CompanyWithMetrics, TreasuryTransaction, FundingMethod, CryptoType } from '@/types';

// Transform database company to match the frontend interface
function transformToCompanyWithMetrics(
  dbCompany: CompanyWithRelations
): CompanyWithMetrics {
  // Calculate total treasury value
  const treasuryValue = dbCompany.treasuryHoldings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0
  );
  
  // Get latest market data
  const latestMarketData = dbCompany.marketData[0] || {
    price: 0,
    change24h: 0,
    change24hPercent: 0,
    volume24h: 0,
    high24h: 0,
    low24h: 0
  };
  
  // Calculate NAV per share
  const navPerShare = (dbCompany.shareholdersEquity + treasuryValue) / dbCompany.sharesOutstanding;
  const premiumToNav = latestMarketData.price - navPerShare;
  const premiumToNavPercent = (premiumToNav / navPerShare) * 100;
  
  // Transform treasury holdings with transactions
  const treasury = dbCompany.treasuryHoldings.map(holding => ({
    crypto: holding.crypto,
    amount: holding.amount,
    averageCostBasis: holding.averageCostBasis,
    totalCost: holding.totalCost,
    currentValue: holding.currentValue,
    unrealizedGain: holding.unrealizedGain,
    unrealizedGainPercent: holding.unrealizedGainPercent,
    stakingYield: holding.stakingYield || undefined,
    stakedAmount: holding.stakedAmount || undefined,
    transactions: (holding.transactions || []).map(tx => ({
      id: tx.id,
      date: tx.date.toISOString(),
      type: tx.type.toLowerCase() as 'purchase' | 'sale' | 'stake' | 'unstake',
      amount: tx.amount,
      pricePerUnit: tx.pricePerUnit,
      totalCost: tx.totalCost,
      fundingMethod: tx.fundingMethod?.toLowerCase() as FundingMethod | undefined,
      notes: tx.notes || undefined
    }))
  }));
  
  // Build capital structure
  const capitalStructure = dbCompany.capitalStructure ? {
    sharesBasic: dbCompany.capitalStructure.sharesBasic,
    sharesDilutedCurrent: dbCompany.capitalStructure.sharesDilutedCurrent,
    sharesDilutedAssumed: dbCompany.capitalStructure.sharesDilutedAssumed,
    sharesFloat: dbCompany.capitalStructure.sharesFloat,
    sharesInsiderOwned: dbCompany.capitalStructure.sharesInsiderOwned,
    sharesInstitutionalOwned: dbCompany.capitalStructure.sharesInstitutionalOwned,
    weightedAverageShares: dbCompany.capitalStructure.weightedAverageShares,
    stockOptions: dbCompany.capitalStructure.stockOptions,
    restrictedStockUnits: dbCompany.capitalStructure.restrictedStockUnits,
    performanceStockUnits: dbCompany.capitalStructure.performanceStockUnits,
    convertibleDebt: dbCompany.capitalStructure.convertibleDebt.map((debt: any) => ({
      issueDate: debt.issueDate,
      maturityDate: debt.maturityDate,
      principal: debt.principal,
      interestRate: debt.interestRate,
      conversionPrice: debt.conversionPrice,
      conversionRatio: debt.conversionRatio,
      currentValue: debt.currentValue,
      isOutstanding: debt.isOutstanding,
      notes: debt.notes || ''
    })),
    warrants: dbCompany.capitalStructure.warrants.map((warrant: any) => ({
      issueDate: warrant.issueDate,
      expirationDate: warrant.expirationDate,
      strikePrice: warrant.strikePrice,
      totalWarrants: warrant.totalWarrants,
      sharesPerWarrant: warrant.sharesPerWarrant,
      isOutstanding: warrant.isOutstanding,
      notes: warrant.notes || ''
    }))
  } : {
    sharesBasic: dbCompany.sharesOutstanding,
    sharesDilutedCurrent: dbCompany.sharesOutstanding,
    sharesDilutedAssumed: dbCompany.sharesOutstanding,
    sharesFloat: dbCompany.sharesOutstanding * 0.8,
    sharesInsiderOwned: dbCompany.sharesOutstanding * 0.15,
    sharesInstitutionalOwned: dbCompany.sharesOutstanding * 0.65,
    weightedAverageShares: dbCompany.sharesOutstanding,
    stockOptions: 0,
    restrictedStockUnits: 0,
    performanceStockUnits: 0,
    convertibleDebt: [],
    warrants: []
  };
  
  // Transform executive compensation
  const executiveCompensation = dbCompany.executiveCompensation || [];
  
  return {
    ticker: dbCompany.ticker,
    name: dbCompany.name,
    description: dbCompany.description || '',
    sector: dbCompany.sector,
    sharesOutstanding: dbCompany.sharesOutstanding,
    shareholdersEquity: dbCompany.shareholdersEquity,
    totalDebt: dbCompany.totalDebt,
    marketCap: dbCompany.marketCap,
    lastUpdated: dbCompany.lastUpdated.toISOString(),
    treasury,
    marketData: {
      ticker: dbCompany.ticker,
      price: latestMarketData.price,
      change24h: latestMarketData.change24h,
      change24hPercent: latestMarketData.change24hPercent,
      volume24h: latestMarketData.volume24h,
      high24h: latestMarketData.high24h || latestMarketData.price,
      low24h: latestMarketData.low24h || latestMarketData.price,
      timestamp: new Date().toISOString()
    },
    metrics: {
      ticker: dbCompany.ticker,
      treasuryValue,
      treasuryValuePerShare: treasuryValue / dbCompany.sharesOutstanding,
      navPerShare,
      stockPrice: latestMarketData.price,
      premiumToNav,
      premiumToNavPercent,
      debtToTreasuryRatio: treasuryValue > 0 ? dbCompany.totalDebt / treasuryValue : 0,
      treasuryConcentration: treasury.reduce((acc, holding) => {
        acc[holding.crypto] = (holding.currentValue / treasuryValue) * 100;
        return acc;
      }, {} as { [key in CryptoType]?: number }),
      cryptoYield: {
        btcYield: 0,
        ethYield: 0,
        solYield: 0,
        totalCryptoYield: 0
      },
      dilutionMetrics: {
        dilutionRate: 0,
        shareCountGrowth: 0,
        treasuryAccretionRate: 0,
        dilutionAdjustedReturn: 0
      },
      riskMetrics: {
        impliedVolatility: 0,
        beta: 0,
        treasuryConcentrationRisk: 0,
        liquidityRisk: 0,
        debtServiceCoverage: 0
      },
      capitalEfficiency: {
        capitalAllocationScore: 0,
        treasuryROI: 0,
        costOfCapital: 0,
        capitalTurnover: 0
      },
      operationalMetrics: {
        revenueDiversification: 0,
        operatingLeverage: 0,
        treasuryFocusRatio: 0,
        cashBurnCoverage: 0
      }
    },
    capitalStructure,
    executiveCompensation: executiveCompensation.map(exec => ({
      name: exec.name,
      title: exec.title,
      year: exec.year,
      cashCompensation: exec.cashCompensation,
      equityCompensation: exec.equityCompensation,
      cryptoCompensation: exec.cryptoCompensation || 0,
      totalCompensation: exec.totalCompensation,
      sharesOwned: exec.sharesOwned,
      sharesOwnership: 0,
      optionsOutstanding: exec.optionsOutstanding
    })),
    businessModel: {
      revenueStreams: [],
      operatingRevenue: 0,
      operatingExpenses: 0,
      cashBurnRate: 0,
      isTreasuryFocused: true,
      legacyBusinessValue: 0
    },
    governance: {
      boardSize: 0,
      independentDirectors: 0,
      ceoFounder: false,
      votingRights: 'standard',
      auditFirm: ''
    }
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    
    // Fetch company from database
    const company = await getCompanyByTicker(ticker);
    
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company not found',
          message: `No company found with ticker: ${ticker.toUpperCase()}`
        },
        { status: 404 }
      );
    }
    
    // Transform to match frontend interface
    const companyWithMetrics = transformToCompanyWithMetrics(company);
    
    return NextResponse.json({
      success: true,
      data: companyWithMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch company:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch company data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}