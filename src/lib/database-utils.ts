import { prisma } from './prisma';
import { CryptoType, Company, TreasuryHolding, HistoricalMetric } from '@prisma/client';
import { dbMonitor, optimizedDb } from './performance/db-optimization';
import { queryCache, CacheKeyGenerator } from './performance/cache-utils';

// Type for company with all related data
export type CompanyWithRelations = Company & {
  treasuryHoldings: TreasuryHolding[];
  marketData: any[];
  capitalStructure: any;
  executiveCompensation: any[];
  historicalMetrics: HistoricalMetric[];
};

/**
 * Get all companies with their treasury holdings and market data
 */
export async function getCompaniesWithTreasury() {
  const cacheKey = CacheKeyGenerator.generateForQuery('company', 'findMany', { withTreasury: true });
  
  return await optimizedDb.cachedQuery(
    cacheKey,
    async () => {
      return await dbMonitor.executeWithMetrics(
        async () => prisma.company.findMany({
          include: {
            treasuryHoldings: {
              orderBy: { currentValue: 'desc' },
            },
            marketData: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            capitalStructure: {
              include: {
                convertibleDebt: true,
                warrants: true,
              },
            },
          },
          orderBy: { marketCap: 'desc' },
        }),
        'getCompaniesWithTreasury'
      );
    },
    30000 // Cache for 30 seconds
  );
}

/**
 * Get a specific company by ticker with all related data
 */
export async function getCompanyByTicker(ticker: string): Promise<CompanyWithRelations | null> {
  const cacheKey = CacheKeyGenerator.generateForQuery('company', 'findUnique', { ticker: ticker.toUpperCase() });
  
  return await optimizedDb.cachedQuery(
    cacheKey,
    async () => {
      return await dbMonitor.executeWithMetrics(
        async () => prisma.company.findUnique({
          where: { ticker: ticker.toUpperCase() },
          include: {
            treasuryHoldings: {
              include: {
                transactions: {
                  orderBy: { date: 'desc' },
                  take: 10, // Last 10 transactions
                },
              },
              orderBy: { currentValue: 'desc' },
            },
            marketData: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            capitalStructure: {
              include: {
                convertibleDebt: {
                  where: { isOutstanding: true },
                },
                warrants: {
                  where: { isOutstanding: true },
                },
              },
            },
            executiveCompensation: {
              orderBy: [{ year: 'desc' }, { totalCompensation: 'desc' }],
              take: 10,
            },
            historicalMetrics: {
              orderBy: { date: 'desc' },
              take: 365, // Last year of data
            },
          },
        }),
        'getCompanyByTicker',
        { ticker }
      );
    },
    60000 // Cache for 1 minute
  );
}

/**
 * Get treasury holdings summary across all companies
 */
export async function getTreasuryHoldingsSummary() {
  const holdings = await prisma.treasuryHolding.groupBy({
    by: ['crypto'],
    _sum: {
      amount: true,
      totalCost: true,
      currentValue: true,
      unrealizedGain: true,
    },
    _count: {
      id: true,
    },
  });

  return holdings.map(holding => ({
    crypto: holding.crypto,
    totalAmount: holding._sum.amount || 0,
    totalCost: holding._sum.totalCost || 0,
    totalCurrentValue: holding._sum.currentValue || 0,
    totalUnrealizedGain: holding._sum.unrealizedGain || 0,
    companiesCount: holding._count.id,
    avgUnrealizedGainPercent: holding._sum.totalCost 
      ? ((holding._sum.unrealizedGain || 0) / (holding._sum.totalCost || 1)) * 100 
      : 0,
  }));
}

/**
 * Update market data for a company
 */
export async function updateCompanyMarketData(
  ticker: string,
  marketData: {
    price: number;
    change24h: number;
    change24hPercent: number;
    volume24h: number;
    high24h?: number;
    low24h?: number;
  }
) {
  const company = await prisma.company.findUnique({
    where: { ticker: ticker.toUpperCase() },
  });

  if (!company) {
    throw new Error(`Company with ticker ${ticker} not found`);
  }

  return await prisma.marketData.create({
    data: {
      ticker: ticker.toUpperCase(),
      companyId: company.id,
      ...marketData,
      timestamp: new Date(),
    },
  });
}

/**
 * Update crypto market data
 */
export async function updateCryptoMarketData(
  symbol: CryptoType,
  marketData: {
    price: number;
    change24h: number;
    change24hPercent: number;
    volume24h: number;
    marketCap: number;
    high24h?: number;
    low24h?: number;
  }
) {
  return await prisma.marketData.create({
    data: {
      ticker: symbol,
      symbol: symbol,
      ...marketData,
      timestamp: new Date(),
    },
  });
}

/**
 * Recalculate treasury holding values based on current crypto prices
 */
export async function recalculateTreasuryValues(cryptoPrices: Record<CryptoType, number>) {
  const holdings = await dbMonitor.executeWithMetrics(
    async () => prisma.treasuryHolding.findMany(),
    'recalculateTreasuryValues.findMany'
  );

  const updates = holdings
    .map(holding => {
      const currentPrice = cryptoPrices[holding.crypto];
      if (!currentPrice) return null;

      const currentValue = holding.amount * currentPrice;
      const unrealizedGain = currentValue - holding.totalCost;
      const unrealizedGainPercent = (unrealizedGain / holding.totalCost) * 100;

      return {
        id: holding.id,
        currentValue,
        unrealizedGain,
        unrealizedGainPercent,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      currentValue: number;
      unrealizedGain: number;
      unrealizedGainPercent: number;
    }>;

  // Use batch update for better performance
  return await optimizedDb.batchUpdate('treasuryHolding', updates);
}

/**
 * Get historical data for a company within a date range
 */
export async function getCompanyHistoricalData(
  ticker: string,
  startDate: Date,
  endDate: Date
) {
  const company = await prisma.company.findUnique({
    where: { ticker: ticker.toUpperCase() },
  });

  if (!company) {
    throw new Error(`Company with ticker ${ticker} not found`);
  }

  return await prisma.historicalMetric.findMany({
    where: {
      companyId: company.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * Get top performing treasury holdings
 */
export async function getTopPerformingHoldings(limit: number = 10) {
  return await prisma.treasuryHolding.findMany({
    include: {
      company: {
        select: {
          ticker: true,
          name: true,
        },
      },
    },
    orderBy: { unrealizedGainPercent: 'desc' },
    take: limit,
  });
}

/**
 * Get companies by treasury value
 */
export async function getCompaniesByTreasuryValue(limit: number = 10) {
  const companies = await prisma.company.findMany({
    include: {
      treasuryHoldings: true,
    },
  });

  const companiesWithTreasuryValue = companies.map(company => {
    const totalTreasuryValue = company.treasuryHoldings.reduce(
      (sum, holding) => sum + holding.currentValue,
      0
    );
    return {
      ...company,
      totalTreasuryValue,
    };
  });

  return companiesWithTreasuryValue
    .sort((a, b) => b.totalTreasuryValue - a.totalTreasuryValue)
    .slice(0, limit);
}

/**
 * Search companies by name or ticker
 */
export async function searchCompanies(query: string) {
  return await prisma.company.findMany({
    where: {
      OR: [
        { ticker: { contains: query.toUpperCase() } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      treasuryHoldings: {
        select: {
          crypto: true,
          amount: true,
          currentValue: true,
        },
      },
    },
    take: 10,
  });
}

/**
 * Get data source health status
 */
export async function getDataSourceHealth() {
  return await prisma.dataSource.findMany({
    orderBy: [{ status: 'asc' }, { lastSync: 'desc' }],
  });
}

/**
 * Update data source status
 */
export async function updateDataSourceStatus(
  name: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE',
  lastError?: string
) {
  return await prisma.dataSource.update({
    where: { name },
    data: {
      status,
      lastSync: new Date(),
      lastError: lastError || null,
      errorCount: lastError ? { increment: 1 } : { set: 0 },
    },
  });
}

/**
 * Batch operations for better performance
 */
export const batchOperations = {
  /**
   * Batch update treasury holdings with performance optimization
   */
  async updateTreasuryHoldings(updates: Array<{
    id: string;
    currentValue: number;
    unrealizedGain: number;
    unrealizedGainPercent: number;
  }>) {
    // Clear cache for affected holdings
    updates.forEach(update => {
      const cacheKey = CacheKeyGenerator.generateForQuery('treasuryHolding', 'findUnique', { id: update.id });
      queryCache.invalidate(cacheKey);
    });
    
    return await optimizedDb.batchUpdate('treasuryHolding', 
      updates.map(update => ({
        ...update,
        updatedAt: new Date(),
      }))
    );
  },

  /**
   * Batch create market data entries with performance optimization
   */
  async createMarketDataEntries(entries: Array<{
    ticker: string;
    symbol?: string;
    price: number;
    change24h: number;
    change24hPercent: number;
    volume24h: number;
    marketCap?: number;
  }>) {
    return await optimizedDb.batchCreate(
      'marketData',
      entries.map(entry => ({
        ...entry,
        timestamp: new Date(),
      })),
      { skipDuplicates: true }
    );
  },
};