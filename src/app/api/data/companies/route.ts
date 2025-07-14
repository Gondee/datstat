import { NextResponse } from 'next/server';
import { getCompaniesWithTreasury } from '@/lib/database-utils';
import { CompanyWithRelations } from '@/lib/database-utils';
import { CompanyWithMetrics, CalculatedMetrics } from '@/types';
import InstitutionalMetricsEngine from '@/utils/institutionalMetrics';

// Transform database company to match the frontend interface
function transformToCompanyWithMetrics(dbCompany: CompanyWithRelations): CompanyWithMetrics {
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
    low24h: 0,
    timestamp: new Date()
  };
  
  // Calculate NAV per share
  const navPerShare = (dbCompany.shareholdersEquity + treasuryValue - dbCompany.totalDebt) / dbCompany.sharesOutstanding;
  const premiumToNav = latestMarketData.price - navPerShare;
  const premiumToNavPercent = navPerShare > 0 ? (premiumToNav / navPerShare) * 100 : 0;
  
  // Transform treasury holdings
  const treasury = dbCompany.treasuryHoldings.map(holding => ({
    crypto: holding.crypto as 'BTC' | 'ETH' | 'SOL',
    amount: holding.amount,
    averageCostBasis: holding.averageCostBasis,
    totalCost: holding.totalCost,
    currentValue: holding.currentValue,
    unrealizedGain: holding.unrealizedGain,
    unrealizedGainPercent: holding.unrealizedGainPercent,
    stakingYield: holding.stakingYield || undefined,
    stakedAmount: holding.stakedAmount || undefined,
    transactions: [] // We'll load transactions separately when needed
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
      id: debt.id,
      issueDate: debt.issueDate.toISOString(),
      maturityDate: debt.maturityDate.toISOString(),
      principal: debt.principal,
      interestRate: debt.interestRate,
      conversionPrice: debt.conversionPrice,
      conversionRatio: debt.conversionRatio,
      currentValue: debt.currentValue,
      isOutstanding: debt.isOutstanding,
      notes: debt.notes || undefined
    })),
    warrants: dbCompany.capitalStructure.warrants.map((warrant: any) => ({
      id: warrant.id,
      issueDate: warrant.issueDate.toISOString(),
      expirationDate: warrant.expirationDate.toISOString(),
      strikePrice: warrant.strikePrice,
      totalWarrants: warrant.totalWarrants,
      sharesPerWarrant: warrant.sharesPerWarrant,
      isOutstanding: warrant.isOutstanding,
      notes: warrant.notes || undefined
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

  // Transform historical data for metrics calculation
  const historicalData = dbCompany.historicalMetrics?.map(metric => ({
    date: metric.date.toISOString(),
    stockPrice: metric.stockPrice,
    treasuryValue: metric.treasuryValue,
    navPerShare: metric.navPerShare,
    premiumToNav: metric.premiumToNav,
    volume: metric.volume,
    sharesOutstanding: metric.sharesOutstanding,
    sharesDiluted: metric.sharesDiluted,
    cryptoYield: metric.cryptoYield,
    impliedVolatility: metric.impliedVolatility || 0,
    beta: metric.beta || 0,
    institutionalOwnership: metric.institutionalOwnership || 0,
    shortInterest: metric.shortInterest || 0,
    borrowCost: metric.borrowCost || 0
  })) || [];

  // Build the company object in the format expected by the metrics engine
  const companyData = {
    ticker: dbCompany.ticker,
    name: dbCompany.name,
    description: dbCompany.description || '',
    sector: dbCompany.sector,
    marketCap: dbCompany.marketCap,
    sharesOutstanding: dbCompany.sharesOutstanding,
    shareholdersEquity: dbCompany.shareholdersEquity,
    totalDebt: dbCompany.totalDebt,
    treasury,
    lastUpdated: dbCompany.lastUpdated.toISOString(),
    capitalStructure,
    executiveCompensation: dbCompany.executiveCompensation?.map(comp => ({
      name: comp.name,
      title: comp.title,
      cashCompensation: comp.cashCompensation,
      equityCompensation: comp.equityCompensation,
      cryptoCompensation: comp.cryptoCompensation || undefined,
      totalCompensation: comp.totalCompensation,
      sharesOwned: comp.sharesOwned,
      optionsOutstanding: comp.optionsOutstanding,
      year: comp.year
    })) || [],
    businessModel: {
      revenueStreams: dbCompany.revenueStreams || [],
      operatingRevenue: dbCompany.operatingRevenue || 0,
      operatingExpenses: dbCompany.operatingExpenses || 0,
      cashBurnRate: dbCompany.cashBurnRate || 0,
      isTreasuryFocused: dbCompany.isTreasuryFocused || false,
      legacyBusinessValue: dbCompany.legacyBusinessValue || 0
    },
    governance: {
      boardSize: dbCompany.boardSize || 0,
      independentDirectors: dbCompany.independentDirectors || 0,
      ceoFounder: dbCompany.ceoFounder || false,
      votingRights: dbCompany.votingRights || '',
      auditFirm: dbCompany.auditFirm || ''
    }
  };

  // Calculate comprehensive metrics using the institutional metrics engine
  const metrics = InstitutionalMetricsEngine.calculateComprehensiveMetrics(
    companyData,
    historicalData
  );

  // Build market data object
  const marketData = {
    ticker: dbCompany.ticker,
    price: latestMarketData.price,
    change24h: latestMarketData.change24h,
    change24hPercent: latestMarketData.change24hPercent,
    volume24h: latestMarketData.volume24h,
    high24h: latestMarketData.high24h || latestMarketData.price,
    low24h: latestMarketData.low24h || latestMarketData.price,
    timestamp: latestMarketData.timestamp?.toISOString() || new Date().toISOString()
  };

  // Return the complete CompanyWithMetrics object
  return {
    ...companyData,
    marketData,
    metrics,
    historicalData
  };
}

export async function GET() {
  try {
    // Fetch companies from database
    const companies = await getCompaniesWithTreasury();
    
    // Transform to match frontend interface
    const companiesWithMetrics = companies.map(transformToCompanyWithMetrics);
    
    return NextResponse.json({
      success: true,
      data: companiesWithMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch companies data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}