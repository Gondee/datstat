import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { validateQueryParams, validateRequest } from '../middleware/validation';
import { treasuryQuerySchema, treasuryTransactionSchema } from '../middleware/validation';
import { hasPermission } from '../middleware/auth';
import { auditLog } from '../middleware/logging';

// GET /api/v1/treasury
export async function getTreasuryHoldings(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const { data: query, error } = validateQueryParams(searchParams, treasuryQuerySchema);

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const where: any = {};

    if (query?.ticker) {
      where.company = { ticker: query.ticker.toUpperCase() };
    }

    if (query?.crypto) {
      where.crypto = query.crypto;
    }

    if (query?.minHolding !== undefined) {
      where.amount = { gte: query.minHolding };
    }

    const [total, holdings] = await Promise.all([
      prisma.treasuryHolding.count({ where }),
      prisma.treasuryHolding.findMany({
        where,
        skip: ((query?.page || 1) - 1) * (query?.limit || 20),
        take: query?.limit || 20,
        orderBy: query?.sort
          ? { [query.sort]: query.order || 'asc' }
          : { currentValue: 'desc' },
        include: {
          company: {
            select: {
              ticker: true,
              name: true,
              marketCap: true,
            },
          },
          transactions: query?.includeTransactions
            ? {
                orderBy: { date: 'desc' },
                take: 10,
              }
            : false,
        },
      }),
    ]);

    // Get current crypto prices
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: {
        symbol: { in: ['BTC', 'ETH', 'SOL'] },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate current values
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

    return ApiResponseBuilder.paginated(enrichedHoldings, {
      page: query?.page || 1,
      limit: query?.limit || 20,
      total,
    });
  } catch (error) {
    console.error('Error fetching treasury holdings:', error);
    return ApiResponseBuilder.internalError('Failed to fetch treasury holdings');
  }
}

// GET /api/v1/treasury/:ticker/:crypto
export async function getTreasuryHolding(
  req: NextRequest,
  params: { ticker: string; crypto: string }
): Promise<NextResponse> {
  try {
    const holding = await prisma.treasuryHolding.findUnique({
      where: {
        companyTicker_crypto: {
          companyTicker: params.ticker.toUpperCase(),
          crypto: params.crypto.toUpperCase() as any,
        },
      },
      include: {
        company: true,
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!holding) {
      return ApiResponseBuilder.notFound('Treasury holding');
    }

    // Get current price
    const cryptoPrice = await prisma.cryptoPrice.findFirst({
      where: { symbol: holding.crypto },
      orderBy: { timestamp: 'desc' },
    });

    const currentPrice = cryptoPrice?.price || 0;
    const currentValue = holding.amount * currentPrice;
    const unrealizedGain = currentValue - holding.totalCost;
    const unrealizedGainPercent = holding.totalCost > 0
      ? (unrealizedGain / holding.totalCost) * 100
      : 0;

    return ApiResponseBuilder.success({
      ...holding,
      currentPrice,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
    });
  } catch (error) {
    console.error('Error fetching treasury holding:', error);
    return ApiResponseBuilder.internalError('Failed to fetch treasury holding');
  }
}

// POST /api/v1/treasury/:ticker/:crypto/transactions (Admin only)
export async function addTreasuryTransaction(
  req: NextRequest,
  params: { ticker: string; crypto: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  
  if (!user || !hasPermission(user, 'admin')) {
    return ApiResponseBuilder.forbidden('Admin access required');
  }

  const { data: transaction, error } = await validateRequest(req, treasuryTransactionSchema);
  
  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current holding
      const holding = await tx.treasuryHolding.findUnique({
        where: {
          companyTicker_crypto: {
            companyTicker: params.ticker.toUpperCase(),
            crypto: params.crypto.toUpperCase() as any,
          },
        },
      });

      if (!holding) {
        // Create new holding if it doesn't exist
        const newHolding = await tx.treasuryHolding.create({
          data: {
            companyTicker: params.ticker.toUpperCase(),
            crypto: params.crypto.toUpperCase() as any,
            amount: transaction!.amount,
            averageCostBasis: transaction!.pricePerUnit,
            totalCost: transaction!.totalCost,
          },
        });

        // Create transaction
        const txRecord = await tx.treasuryTransaction.create({
          data: {
            ...transaction!,
            holdingId: newHolding.id,
          },
        });

        return { holding: newHolding, transaction: txRecord };
      }

      // Update existing holding
      let newAmount = holding.amount;
      let newTotalCost = holding.totalCost;

      if (transaction!.type === 'purchase') {
        newAmount += transaction!.amount;
        newTotalCost += transaction!.totalCost;
      } else if (transaction!.type === 'sale') {
        newAmount -= transaction!.amount;
        newTotalCost -= transaction!.totalCost;
      }

      const newAverageCostBasis = newAmount > 0 ? newTotalCost / newAmount : 0;

      const updatedHolding = await tx.treasuryHolding.update({
        where: { id: holding.id },
        data: {
          amount: newAmount,
          averageCostBasis: newAverageCostBasis,
          totalCost: newTotalCost,
        },
      });

      // Create transaction record
      const txRecord = await tx.treasuryTransaction.create({
        data: {
          ...transaction!,
          holdingId: holding.id,
        },
      });

      return { holding: updatedHolding, transaction: txRecord };
    });

    // Audit log
    await auditLog(
      'treasury.transaction',
      'treasury',
      `${params.ticker}:${params.crypto}`,
      transaction,
      { id: user.id, type: 'user' }
    );

    return ApiResponseBuilder.success(result, { status: 201 });
  } catch (error) {
    console.error('Error adding treasury transaction:', error);
    return ApiResponseBuilder.internalError('Failed to add treasury transaction');
  }
}

// GET /api/v1/treasury/summary
export async function getTreasurySummary(req: NextRequest): Promise<NextResponse> {
  try {
    // Get all holdings with company data
    const holdings = await prisma.treasuryHolding.findMany({
      include: {
        company: {
          select: {
            ticker: true,
            name: true,
            marketCap: true,
            sharesOutstanding: true,
          },
        },
      },
    });

    // Get current crypto prices
    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where: {
        symbol: { in: ['BTC', 'ETH', 'SOL'] },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });

    const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));

    // Calculate summary statistics
    const summary = {
      totalValue: 0,
      totalCost: 0,
      totalUnrealizedGain: 0,
      byCompany: new Map<string, any>(),
      byCrypto: new Map<string, any>(),
      topHoldings: [] as any[],
    };

    holdings.forEach(holding => {
      const currentPrice = priceMap.get(holding.crypto) || 0;
      const currentValue = holding.amount * currentPrice;
      const unrealizedGain = currentValue - holding.totalCost;

      summary.totalValue += currentValue;
      summary.totalCost += holding.totalCost;
      summary.totalUnrealizedGain += unrealizedGain;

      // By company
      if (!summary.byCompany.has(holding.companyTicker)) {
        summary.byCompany.set(holding.companyTicker, {
          ticker: holding.companyTicker,
          name: holding.company.name,
          totalValue: 0,
          totalCost: 0,
          holdings: [],
        });
      }
      const companyData = summary.byCompany.get(holding.companyTicker);
      companyData.totalValue += currentValue;
      companyData.totalCost += holding.totalCost;
      companyData.holdings.push({
        crypto: holding.crypto,
        amount: holding.amount,
        value: currentValue,
      });

      // By crypto
      if (!summary.byCrypto.has(holding.crypto)) {
        summary.byCrypto.set(holding.crypto, {
          crypto: holding.crypto,
          totalAmount: 0,
          totalValue: 0,
          totalCost: 0,
          avgPrice: currentPrice,
          holders: [],
        });
      }
      const cryptoData = summary.byCrypto.get(holding.crypto);
      cryptoData.totalAmount += holding.amount;
      cryptoData.totalValue += currentValue;
      cryptoData.totalCost += holding.totalCost;
      cryptoData.holders.push({
        ticker: holding.companyTicker,
        amount: holding.amount,
        value: currentValue,
      });
    });

    // Convert maps to arrays and sort
    const byCompanyArray = Array.from(summary.byCompany.values())
      .sort((a, b) => b.totalValue - a.totalValue);
    
    const byCryptoArray = Array.from(summary.byCrypto.values())
      .sort((a, b) => b.totalValue - a.totalValue);

    // Get top holdings
    const topHoldings = holdings
      .map(h => ({
        ticker: h.companyTicker,
        name: h.company.name,
        crypto: h.crypto,
        amount: h.amount,
        value: h.amount * (priceMap.get(h.crypto) || 0),
        percentOfMarketCap: (h.amount * (priceMap.get(h.crypto) || 0)) / h.company.marketCap * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return ApiResponseBuilder.success({
      totalValue: summary.totalValue,
      totalCost: summary.totalCost,
      totalUnrealizedGain: summary.totalUnrealizedGain,
      totalUnrealizedGainPercent: summary.totalCost > 0
        ? (summary.totalUnrealizedGain / summary.totalCost) * 100
        : 0,
      byCompany: byCompanyArray,
      byCrypto: byCryptoArray,
      topHoldings,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching treasury summary:', error);
    return ApiResponseBuilder.internalError('Failed to fetch treasury summary');
  }
}