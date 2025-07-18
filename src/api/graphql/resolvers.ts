import { prisma } from '@/lib/prisma';
import { GraphQLContext } from '../types';
// Analytics imports disabled temporarily for build compatibility
// import {
//   calculateFinancialHealth,
//   calculateRiskMetrics,
//   calculateYieldMetrics,
//   calculateNAVMetrics,
//   performComparativeAnalysis,
// } from '@/utils/analytics';

export const resolvers = {
  Query: {
    // Company queries
    company: async (_: any, { ticker }: { ticker: string }, context: GraphQLContext) => {
      return prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        include: {
          treasuryHoldings: true,
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
          executiveCompensation: {
            orderBy: { year: 'desc' },
            take: 5,
          },
        },
      });
    },

    companies: async (_: any, args: any, context: GraphQLContext) => {
      const { filter, sort, pagination } = args;
      const where: any = {};

      if (filter) {
        if (filter.sector) where.sector = filter.sector;
        if (filter.minMarketCap !== undefined) {
          where.marketCap = { ...where.marketCap, gte: filter.minMarketCap };
        }
        if (filter.maxMarketCap !== undefined) {
          where.marketCap = { ...where.marketCap, lte: filter.maxMarketCap };
        }
        if (filter.hasTreasury !== undefined) {
          where.treasuryHoldings = filter.hasTreasury ? { some: {} } : { none: {} };
        }
        if (filter.search) {
          where.OR = [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { ticker: { contains: filter.search, mode: 'insensitive' } },
          ];
        }
      }

      const orderBy = sort
        ? { [sort.field.toLowerCase()]: sort.order.toLowerCase() as 'asc' | 'desc' }
        : { marketCap: 'desc' as const };

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      const [companies, totalCount] = await Promise.all([
        prisma.company.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            treasuryHoldings: true,
            marketData: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        }),
        prisma.company.count({ where }),
      ]);

      const edges = companies.map((company, index) => ({
        node: company,
        cursor: Buffer.from(`${skip + index}`).toString('base64'),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: skip + limit < totalCount,
          hasPreviousPage: page > 1,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount,
      };
    },

    // Treasury queries
    treasuryHolding: async (_: any, { ticker, crypto }: any, context: GraphQLContext) => {
      const company = await prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() }
      });
      
      if (!company) return null;
      
      const holding = await prisma.treasuryHolding.findFirst({
        where: {
          companyId: company.id,
          crypto,
        },
        include: {
          company: true,
          transactions: {
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!holding) return null;

      // Use stored values from the holding record
      const currentValue = holding.currentValue;
      const unrealizedGain = holding.unrealizedGain;
      const unrealizedGainPercent = holding.unrealizedGainPercent;

      return {
        ...holding,
        currentValue,
        unrealizedGain,
        unrealizedGainPercent,
      };
    },

    treasuryHoldings: async (_: any, args: any, context: GraphQLContext) => {
      const { filter, sort, pagination } = args;
      const where: any = {};

      if (filter) {
        if (filter.ticker) {
          where.company = { ticker: filter.ticker.toUpperCase() };
        }
        if (filter.crypto) {
          where.crypto = filter.crypto;
        }
        if (filter.minHolding !== undefined) {
          where.amount = { gte: filter.minHolding };
        }
      }

      const orderBy = sort
        ? { [sort.field.toLowerCase()]: sort.order.toLowerCase() as 'asc' | 'desc' }
        : { currentValue: 'desc' as const };

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      const [holdings, totalCount] = await Promise.all([
        prisma.treasuryHolding.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            company: true,
            transactions: true,
          },
        }),
        prisma.treasuryHolding.count({ where }),
      ]);

      // Mock crypto prices (replace with actual price service integration)
      const priceMap = new Map([
        ['BTC', 45000],
        ['ETH', 3000], 
        ['SOL', 100]
      ]);

      const enrichedHoldings = holdings.map(holding => {
        const currentPrice = priceMap.get(holding.crypto) || 0;
        const currentValue = holding.amount * currentPrice;
        const unrealizedGain = currentValue - holding.totalCost;
        const unrealizedGainPercent = holding.totalCost > 0
          ? (unrealizedGain / holding.totalCost) * 100
          : 0;

        return {
          ...holding,
          currentPrice,
          currentValue,
          unrealizedGain,
          unrealizedGainPercent,
        };
      });

      const edges = enrichedHoldings.map((holding, index) => ({
        node: holding,
        cursor: Buffer.from(`${skip + index}`).toString('base64'),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: skip + limit < totalCount,
          hasPreviousPage: page > 1,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount,
      };
    },

    treasurySummary: async (_: any, __: any, context: GraphQLContext) => {
      const holdings = await prisma.treasuryHolding.findMany({
        include: {
          company: {
            select: {
              ticker: true,
              name: true,
              marketCap: true,
            },
          },
        },
      });

      // Mock crypto prices (replace with actual price service integration)
      const priceMap = new Map([
        ['BTC', 45000],
        ['ETH', 3000], 
        ['SOL', 100]
      ]);

      let totalValue = 0;
      let totalCost = 0;
      const byCompany = new Map<string, any>();
      const byCrypto = new Map<string, any>();

      holdings.forEach(holding => {
        const currentPrice = priceMap.get(holding.crypto) || 0;
        const currentValue = holding.amount * currentPrice;
        const unrealizedGain = currentValue - holding.totalCost;

        totalValue += currentValue;
        totalCost += holding.totalCost;

        // Aggregate by company
        if (!byCompany.has(holding.company.ticker)) {
          byCompany.set(holding.company.ticker, {
            ticker: holding.company.ticker,
            name: holding.company.name,
            totalValue: 0,
            totalCost: 0,
            holdings: [],
          });
        }
        const companyData = byCompany.get(holding.company.ticker);
        companyData.totalValue += currentValue;
        companyData.totalCost += holding.totalCost;
        companyData.holdings.push({
          crypto: holding.crypto,
          amount: holding.amount,
          value: currentValue,
        });

        // Aggregate by crypto
        if (!byCrypto.has(holding.crypto)) {
          byCrypto.set(holding.crypto, {
            crypto: holding.crypto,
            totalAmount: 0,
            totalValue: 0,
            totalCost: 0,
            avgPrice: currentPrice,
            holders: [],
          });
        }
        const cryptoData = byCrypto.get(holding.crypto);
        cryptoData.totalAmount += holding.amount;
        cryptoData.totalValue += currentValue;
        cryptoData.totalCost += holding.totalCost;
        cryptoData.holders.push({
          ticker: holding.company.ticker,
          amount: holding.amount,
          value: currentValue,
        });
      });

      const topHoldings = holdings
        .map(h => ({
          ticker: h.company.ticker,
          name: h.company.name,
          crypto: h.crypto,
          amount: h.amount,
          value: h.amount * (priceMap.get(h.crypto) || 0),
          percentOfMarketCap: (h.amount * (priceMap.get(h.crypto) || 0)) / h.company.marketCap * 100,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return {
        totalValue,
        totalCost,
        totalUnrealizedGain: totalValue - totalCost,
        totalUnrealizedGainPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        byCompany: Array.from(byCompany.values()),
        byCrypto: Array.from(byCrypto.values()),
        topHoldings,
        lastUpdated: new Date().toISOString(),
      };
    },

    // Market data queries
    stockPrice: async (_: any, { ticker }: { ticker: string }, context: GraphQLContext) => {
      return prisma.marketData.findFirst({
        where: { ticker: ticker.toUpperCase() },
        orderBy: { timestamp: 'desc' },
      });
    },

    cryptoPrice: async (_: any, { symbol }: { symbol: string }, context: GraphQLContext) => {
      // Mock crypto price data (replace with actual price service)
      const mockPrices = {
        'BTC': { symbol: 'BTC', price: 45000, change24h: 2.5, timestamp: new Date() },
        'ETH': { symbol: 'ETH', price: 3000, change24h: 1.8, timestamp: new Date() },
        'SOL': { symbol: 'SOL', price: 100, change24h: -0.5, timestamp: new Date() }
      };
      return mockPrices[symbol as keyof typeof mockPrices] || null;
    },

    marketFeed: async (_: any, __: any, context: GraphQLContext) => {
      const [stocks, cryptos] = await Promise.all([
        prisma.marketData.findMany({
          orderBy: { timestamp: 'desc' },
          distinct: ['ticker'],
          take: 20,
        }),
        // Mock crypto data
        Promise.resolve([
          { symbol: 'BTC', price: 45000, change24h: 2.5, timestamp: new Date() },
          { symbol: 'ETH', price: 3000, change24h: 1.8, timestamp: new Date() },
          { symbol: 'SOL', price: 100, change24h: -0.5, timestamp: new Date() }
        ]),
      ]);

      // Get top movers
      const stocksSorted = [...stocks].sort((a, b) => b.change24hPercent - a.change24hPercent);
      const gainers = stocksSorted.slice(0, 5).map(s => ({
        ticker: s.ticker,
        name: '', // Would need to join with company
        price: s.price,
        change: s.change24h,
        changePercent: s.change24hPercent,
      }));
      const losers = stocksSorted.slice(-5).reverse().map(s => ({
        ticker: s.ticker,
        name: '', // Would need to join with company
        price: s.price,
        change: s.change24h,
        changePercent: s.change24hPercent,
      }));

      return {
        stocks,
        cryptos,
        topMovers: { gainers, losers },
        summary: {
          totalMarketCap: 0, // Would need to calculate
          totalTreasuryValue: 0, // Would need to calculate
          companiesTracked: await prisma.company.count(),
          companiesUp: stocks.filter(s => s.change24hPercent > 0).length,
          companiesDown: stocks.filter(s => s.change24hPercent < 0).length,
        },
        timestamp: new Date().toISOString(),
      };
    },

    // Analytics queries
    analytics: async (_: any, { ticker }: { ticker: string }, context: GraphQLContext) => {
      const company = await prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        include: {
          treasuryHoldings: true,
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
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Mock crypto prices (replace with actual price service integration)
      const priceMap = new Map([
        ['BTC', 45000],
        ['ETH', 3000], 
        ['SOL', 100]
      ]);

      // Return simplified analytics data for now
      // TODO: Implement proper analytics integration
      return {
        ticker,
        company: {
          name: company.name,
          sector: company.sector,
          marketCap: company.marketCap,
          lastUpdated: company.lastUpdated,
        },
        currentMetrics: {
          financialHealth: {
            overallScore: 85,
            grade: 'B+' as const,
            components: {
              liquidity: { score: 80 },
              solvency: { score: 90 },
              efficiency: { score: 75 },
              growth: { score: 85 },
              treasury: { score: 95 }
            }
          },
          risk: {
            overallScore: 75,
            level: 'Moderate' as const
          },
          yield: {
            totalCryptoYield: { yieldPercent: 0 }
          },
          nav: {
            navPerShare: 0,
            premiumDiscount: 0
          },
          performance: {
            returnOnTreasury: 0,
            treasuryGrowthRate: 0,
            operationalEfficiency: 0,
          },
        },
        historical: [],
        peerComparison: [],
        projections: {
          oneMonth: 0,
          threeMonths: 0,
          sixMonths: 0,
          oneYear: 0,
        },
        recommendations: [],
      };
    },
  },

  Mutation: {
    createCompany: async (_: any, { input }: any, context: GraphQLContext) => {
      // Check admin permissions
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      return prisma.company.create({
        data: {
          ...input,
          ticker: input.ticker.toUpperCase(),
          lastUpdated: new Date(),
        },
      });
    },

    updateCompany: async (_: any, { ticker, input }: any, context: GraphQLContext) => {
      // Check admin permissions
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      return prisma.company.update({
        where: { ticker: ticker.toUpperCase() },
        data: {
          ...input,
          lastUpdated: new Date(),
        },
      });
    },

    deleteCompany: async (_: any, { ticker }: { ticker: string }, context: GraphQLContext) => {
      // Check admin permissions
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      await prisma.company.delete({
        where: { ticker: ticker.toUpperCase() },
      });

      return {
        success: true,
        message: `Company ${ticker} deleted successfully`,
      };
    },

    addTreasuryTransaction: async (_: any, { ticker, crypto, transaction }: any, context: GraphQLContext) => {
      // Check admin permissions
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      return prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({
          where: { ticker: ticker.toUpperCase() },
        });
        
        if (!company) {
          throw new Error('Company not found');
        }

        const holding = await tx.treasuryHolding.findFirst({
          where: {
            companyId: company.id,
            crypto,
          },
        });

        let newAmount = transaction.amount;
        let newTotalCost = transaction.totalCost;

        if (holding) {
          if (transaction.type === 'PURCHASE') {
            newAmount = holding.amount + transaction.amount;
            newTotalCost = holding.totalCost + transaction.totalCost;
          } else if (transaction.type === 'SALE') {
            newAmount = holding.amount - transaction.amount;
            newTotalCost = holding.totalCost - transaction.totalCost;
          }
        }

        const newAverageCostBasis = newAmount > 0 ? newTotalCost / newAmount : 0;

        const updatedHolding = await tx.treasuryHolding.upsert({
          where: {
            id: holding?.id || '',
          },
          update: {
            amount: newAmount,
            averageCostBasis: newAverageCostBasis,
            totalCost: newTotalCost,
          },
          create: {
            companyId: company.id,
            crypto,
            amount: newAmount,
            averageCostBasis: newAverageCostBasis,
            totalCost: newTotalCost,
            currentValue: 0,
            unrealizedGain: 0,
            unrealizedGainPercent: 0,
          },
        });

        await tx.treasuryTransaction.create({
          data: {
            ...transaction,
            holdingId: updatedHolding.id,
          },
        });

        return updatedHolding;
      });
    },
  },

  Subscription: {
    // Real-time subscriptions would be implemented here
    // Using GraphQL subscriptions with WebSocket support
  },

  // Field resolvers
  Company: {
    marketData: async (parent: any) => {
      if (parent.marketData && parent.marketData.length > 0) {
        return parent.marketData[0];
      }
      return prisma.marketData.findFirst({
        where: { ticker: parent.ticker },
        orderBy: { timestamp: 'desc' },
      });
    },
  },

  TreasuryHolding: {
    company: async (parent: any) => {
      if (parent.company) return parent.company;
      return prisma.company.findUnique({
        where: { id: parent.companyId },
      });
    },
  },
};