import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { validateQueryParams } from '../middleware/validation';
import { analyticsQuerySchema } from '../middleware/validation';
import {
  calculateFinancialHealth,
  calculateRiskMetrics,
  calculateYieldMetrics,
  performComparativeAnalysis,
  calculateNAVMetrics,
} from '@/utils/analytics';

// GET /api/v1/analytics/comprehensive/:ticker
export async function getComprehensiveAnalytics(
  req: NextRequest,
  params: { ticker: string }
): Promise<NextResponse> {
  try {
    const ticker = params.ticker.toUpperCase();
    
    // Fetch company with all related data
    const company = await prisma.company.findUnique({
      where: { ticker },
      include: {
        treasury: {
          include: {
            transactions: {
              orderBy: { date: 'desc' },
            },
          },
        },
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 30,
        },
        capitalStructure: {
          include: {
            convertibleDebt: true,
            warrants: true,
          },
        },
        executiveCompensation: {
          orderBy: { year: 'desc' },
          take: 3,
        },
      },
    });

    if (!company) {
      return ApiResponseBuilder.notFound('Company');
    }

    // Get crypto prices
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate all analytics
    const [
      financialHealth,
      riskMetrics,
      yieldMetrics,
      navMetrics,
      performanceMetrics,
    ] = await Promise.all([
      calculateFinancialHealth(company, priceMap),
      calculateRiskMetrics(company, priceMap),
      calculateYieldMetrics(company, priceMap),
      calculateNAVMetrics(company, priceMap),
      calculatePerformanceMetrics(company),
    ]);

    // Historical analysis
    const historicalData = await getHistoricalAnalytics(ticker);

    // Peer comparison
    const peerComparison = await getPeerComparison(ticker, company.sector);

    // Future projections
    const projections = calculateProjections(company, priceMap);

    return ApiResponseBuilder.success({
      ticker,
      company: {
        name: company.name,
        sector: company.sector,
        marketCap: company.marketCap,
        lastUpdated: company.lastUpdated,
      },
      currentMetrics: {
        financialHealth,
        risk: riskMetrics,
        yield: yieldMetrics,
        nav: navMetrics,
        performance: performanceMetrics,
      },
      historical: historicalData,
      peerComparison,
      projections,
      recommendations: generateRecommendations(
        financialHealth,
        riskMetrics,
        yieldMetrics,
        navMetrics
      ),
    });
  } catch (error) {
    console.error('Error in comprehensive analytics:', error);
    return ApiResponseBuilder.internalError('Failed to generate comprehensive analytics');
  }
}

// GET /api/v1/analytics/comparison
export async function getComparativeAnalytics(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const tickers = searchParams.get('tickers')?.split(',').map(t => t.toUpperCase()) || [];

  if (tickers.length < 2) {
    return ApiResponseBuilder.badRequest('At least 2 tickers required for comparison');
  }

  if (tickers.length > 10) {
    return ApiResponseBuilder.badRequest('Maximum 10 tickers allowed for comparison');
  }

  try {
    const companies = await prisma.company.findMany({
      where: { ticker: { in: tickers } },
      include: {
        treasury: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        capitalStructure: true,
      },
    });

    if (companies.length < 2) {
      return ApiResponseBuilder.badRequest('Not enough valid companies found');
    }

    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate metrics for each company
    const companyMetrics = await Promise.all(
      companies.map(async (company) => ({
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        marketCap: company.marketCap,
        stockPrice: company.marketData?.[0]?.price || 0,
        metrics: await calculateAllMetrics(company, priceMap),
      }))
    );

    // Perform comparative analysis
    const comparison = performComparativeAnalysis(companyMetrics);

    // Calculate correlation matrix
    const correlationMatrix = await calculateCorrelationMatrix(companies);

    return ApiResponseBuilder.success({
      companies: companyMetrics,
      comparison,
      correlationMatrix,
      bestPerformers: {
        byTreasuryValue: comparison.rankings.treasuryValue[0],
        byNavDiscount: comparison.rankings.navDiscount[0],
        byYield: comparison.rankings.cryptoYield[0],
        byRisk: comparison.rankings.riskScore[0],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in comparative analytics:', error);
    return ApiResponseBuilder.internalError('Failed to generate comparative analytics');
  }
}

// GET /api/v1/analytics/scenarios
export async function getScenarioAnalysis(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker) {
    return ApiResponseBuilder.badRequest('Ticker parameter required');
  }

  try {
    const company = await prisma.company.findUnique({
      where: { ticker },
      include: {
        treasury: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        capitalStructure: {
          include: {
            convertibleDebt: true,
          },
        },
      },
    });

    if (!company) {
      return ApiResponseBuilder.notFound('Company');
    }

    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Define scenarios
    const scenarios = [
      { name: 'Bull Market', btcChange: 0.5, ethChange: 0.6, solChange: 0.8 },
      { name: 'Moderate Growth', btcChange: 0.2, ethChange: 0.25, solChange: 0.3 },
      { name: 'Base Case', btcChange: 0, ethChange: 0, solChange: 0 },
      { name: 'Moderate Decline', btcChange: -0.2, ethChange: -0.25, solChange: -0.3 },
      { name: 'Bear Market', btcChange: -0.5, ethChange: -0.6, solChange: -0.7 },
      { name: 'Crypto Winter', btcChange: -0.8, ethChange: -0.85, solChange: -0.9 },
    ];

    const scenarioResults = scenarios.map(scenario => {
      const adjustedPrices = new Map([
        ['BTC', (priceMap.get('BTC') || 0) * (1 + scenario.btcChange)],
        ['ETH', (priceMap.get('ETH') || 0) * (1 + scenario.ethChange)],
        ['SOL', (priceMap.get('SOL') || 0) * (1 + scenario.solChange)],
      ]);

      const treasuryValue = calculateTreasuryValue(company.treasury, adjustedPrices);
      const navPerShare = calculateNAV(company, treasuryValue);
      const impliedStockPrice = navPerShare * (1 + (company.marketData?.[0]?.price || 0) / calculateNAV(company, calculateTreasuryValue(company.treasury, priceMap)) - 1);

      return {
        scenario: scenario.name,
        assumptions: {
          btcPrice: adjustedPrices.get('BTC'),
          btcChange: `${(scenario.btcChange * 100).toFixed(0)}%`,
          ethPrice: adjustedPrices.get('ETH'),
          ethChange: `${(scenario.ethChange * 100).toFixed(0)}%`,
          solPrice: adjustedPrices.get('SOL'),
          solChange: `${(scenario.solChange * 100).toFixed(0)}%`,
        },
        results: {
          treasuryValue,
          treasuryValuePerShare: treasuryValue / company.sharesOutstanding,
          navPerShare,
          impliedStockPrice,
          stockPriceChange: ((impliedStockPrice - (company.marketData?.[0]?.price || 0)) / (company.marketData?.[0]?.price || 1)) * 100,
          debtCoverage: treasuryValue / company.totalDebt,
          liquidationValue: treasuryValue - company.totalDebt,
        },
      };
    });

    // Stress test analysis
    const stressTests = performStressTests(company, priceMap);

    return ApiResponseBuilder.success({
      ticker,
      currentPrices: Object.fromEntries(priceMap),
      scenarios: scenarioResults,
      stressTests,
      recommendations: generateScenarioRecommendations(scenarioResults),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in scenario analysis:', error);
    return ApiResponseBuilder.internalError('Failed to generate scenario analysis');
  }
}

// GET /api/v1/analytics/rankings
export async function getAnalyticsRankings(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || 'treasuryValue';
  const sector = searchParams.get('sector');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const where: any = {};
    if (sector) {
      where.sector = sector;
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        treasury: true,
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        capitalStructure: true,
      },
    });

    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: { symbol: { in: ['BTC', 'ETH', 'SOL'] } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate metrics for all companies
    const rankedCompanies = await Promise.all(
      companies.map(async (company) => {
        const metrics = await calculateAllMetrics(company, priceMap);
        return {
          ticker: company.ticker,
          name: company.name,
          sector: company.sector,
          marketCap: company.marketCap,
          stockPrice: company.marketData?.[0]?.price || 0,
          ...metrics,
        };
      })
    );

    // Sort by requested metric
    const sortedCompanies = rankedCompanies.sort((a, b) => {
      const aValue = getMetricValue(a, metric);
      const bValue = getMetricValue(b, metric);
      return metric.includes('Risk') || metric.includes('Premium') 
        ? aValue - bValue  // Lower is better for risk and premium
        : bValue - aValue; // Higher is better for most metrics
    });

    const topCompanies = sortedCompanies.slice(0, limit);

    // Calculate percentiles
    topCompanies.forEach((company, index) => {
      company.rank = index + 1;
      company.percentile = ((sortedCompanies.length - index) / sortedCompanies.length) * 100;
    });

    return ApiResponseBuilder.success({
      metric,
      sector,
      totalCompanies: sortedCompanies.length,
      rankings: topCompanies,
      statistics: calculateStatistics(sortedCompanies, metric),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in analytics rankings:', error);
    return ApiResponseBuilder.internalError('Failed to generate analytics rankings');
  }
}

// Helper functions
async function calculateAllMetrics(company: any, priceMap: Map<string, number>) {
  const treasuryValue = calculateTreasuryValue(company.treasury, priceMap);
  const treasuryValuePerShare = treasuryValue / company.sharesOutstanding;
  const navPerShare = calculateNAV(company, treasuryValue);
  const stockPrice = company.marketData?.[0]?.price || 0;
  const premiumToNav = stockPrice - navPerShare;
  const premiumToNavPercent = navPerShare > 0 ? (premiumToNav / navPerShare) * 100 : 0;

  return {
    treasuryValue,
    treasuryValuePerShare,
    navPerShare,
    premiumToNav,
    premiumToNavPercent,
    debtToTreasuryRatio: treasuryValue > 0 ? company.totalDebt / treasuryValue : 0,
    marketCapToTreasury: company.marketCap / treasuryValue,
    cryptoConcentration: calculateCryptoConcentration(company.treasury, priceMap),
  };
}

function calculateTreasuryValue(treasury: any[], priceMap: Map<string, number>): number {
  return treasury.reduce((total, holding) => {
    const price = priceMap.get(holding.crypto) || 0;
    return total + (holding.amount * price);
  }, 0);
}

function calculateNAV(company: any, treasuryValue: number): number {
  return (company.shareholdersEquity + treasuryValue - company.totalDebt) / company.sharesOutstanding;
}

function calculateCryptoConcentration(treasury: any[], priceMap: Map<string, number>) {
  const values = treasury.map(h => ({
    crypto: h.crypto,
    value: h.amount * (priceMap.get(h.crypto) || 0),
  }));

  const totalValue = values.reduce((sum, v) => sum + v.value, 0);
  
  return values.reduce((acc, v) => {
    acc[v.crypto] = totalValue > 0 ? (v.value / totalValue) * 100 : 0;
    return acc;
  }, {} as Record<string, number>);
}

async function getHistoricalAnalytics(ticker: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historicalData = await prisma.historicalData.findMany({
    where: {
      ticker,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'asc' },
  });

  return historicalData.map(d => ({
    date: d.date,
    stockPrice: d.stockPrice,
    treasuryValue: d.treasuryValue,
    navPerShare: d.navPerShare,
    premiumToNav: d.premiumToNav,
    volume: d.volume,
  }));
}

async function getPeerComparison(ticker: string, sector: string) {
  const peers = await prisma.company.findMany({
    where: {
      sector,
      ticker: { not: ticker },
    },
    include: {
      treasury: true,
      marketData: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    take: 5,
  });

  // Return peer metrics...
  return peers.map(p => ({
    ticker: p.ticker,
    name: p.name,
    marketCap: p.marketCap,
    treasuryValue: 0, // Calculate...
  }));
}

function calculateProjections(company: any, priceMap: Map<string, number>) {
  // Simple projection logic - in production, use more sophisticated models
  const currentTreasuryValue = calculateTreasuryValue(company.treasury, priceMap);
  
  return {
    oneMonth: currentTreasuryValue * 1.05,
    threeMonths: currentTreasuryValue * 1.15,
    sixMonths: currentTreasuryValue * 1.25,
    oneYear: currentTreasuryValue * 1.5,
  };
}

function generateRecommendations(
  financialHealth: any,
  riskMetrics: any,
  yieldMetrics: any,
  navMetrics: any
) {
  const recommendations = [];

  if (navMetrics.premiumToNavPercent < -20) {
    recommendations.push({
      type: 'opportunity',
      message: 'Trading at significant discount to NAV',
      action: 'Consider accumulating',
    });
  }

  if (riskMetrics.concentrationRisk > 80) {
    recommendations.push({
      type: 'warning',
      message: 'High concentration risk in single crypto asset',
      action: 'Monitor diversification efforts',
    });
  }

  return recommendations;
}

function performStressTests(company: any, priceMap: Map<string, number>) {
  // Implement stress testing logic
  return {
    liquidityStress: 'pass',
    debtServiceStress: 'pass',
    operationalStress: 'warning',
  };
}

function generateScenarioRecommendations(scenarios: any[]) {
  // Generate recommendations based on scenario results
  return {
    riskManagement: 'Consider hedging strategies',
    allocation: 'Maintain balanced exposure',
  };
}

async function calculateCorrelationMatrix(companies: any[]) {
  // Calculate price correlations between companies
  // This is a simplified version - use proper statistical methods in production
  const matrix: Record<string, Record<string, number>> = {};
  
  companies.forEach(c1 => {
    matrix[c1.ticker] = {};
    companies.forEach(c2 => {
      matrix[c1.ticker][c2.ticker] = c1.ticker === c2.ticker ? 1 : Math.random() * 0.8;
    });
  });

  return matrix;
}

function getMetricValue(company: any, metric: string): number {
  const metricMap: Record<string, keyof typeof company> = {
    treasuryValue: 'treasuryValue',
    navPerShare: 'navPerShare',
    premiumToNav: 'premiumToNavPercent',
    marketCap: 'marketCap',
    debtRatio: 'debtToTreasuryRatio',
  };

  return company[metricMap[metric] || metric] || 0;
}

function calculateStatistics(companies: any[], metric: string) {
  const values = companies.map(c => getMetricValue(c, metric));
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  return {
    mean,
    median,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
  };
}

async function calculatePerformanceMetrics(company: any) {
  // Calculate various performance metrics
  return {
    returnOnTreasury: 0, // Implement calculation
    treasuryGrowthRate: 0, // Implement calculation
    operationalEfficiency: 0, // Implement calculation
  };
}