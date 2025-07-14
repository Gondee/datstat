import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { validateQueryParams } from '../middleware/validation';
import { marketDataQuerySchema } from '../middleware/validation';

// GET /api/v1/market/stocks
export async function getStockPrices(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const { data: query, error } = validateQueryParams(searchParams, marketDataQuerySchema);

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const where: any = {};

    if (query?.symbols && query.symbols.length > 0) {
      where.ticker = { in: query.symbols.map(s => s.toUpperCase()) };
    }

    if (query?.from) {
      where.timestamp = { ...where.timestamp, gte: new Date(query.from) };
    }

    if (query?.to) {
      where.timestamp = { ...where.timestamp, lte: new Date(query.to) };
    }

    const marketData = await prisma.marketData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query?.limit || 100,
      select: {
        ticker: true,
        price: true,
        change24h: true,
        change24hPercent: true,
        volume24h: true,
        high24h: true,
        low24h: true,
        timestamp: true,
      },
    });

    // Group by ticker for latest prices
    const latestPrices = new Map<string, any>();
    marketData.forEach(data => {
      if (!latestPrices.has(data.ticker)) {
        latestPrices.set(data.ticker, data);
      }
    });

    return ApiResponseBuilder.success({
      prices: Array.from(latestPrices.values()),
      count: latestPrices.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return ApiResponseBuilder.internalError('Failed to fetch stock prices');
  }
}

// GET /api/v1/market/crypto
export async function getCryptoPrices(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const { data: query, error } = validateQueryParams(searchParams, marketDataQuerySchema);

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const where: any = {};

    if (query?.symbols && query.symbols.length > 0) {
      where.symbol = { in: query.symbols.map(s => s.toUpperCase()) };
    }

    if (query?.from) {
      where.timestamp = { ...where.timestamp, gte: new Date(query.from) };
    }

    if (query?.to) {
      where.timestamp = { ...where.timestamp, lte: new Date(query.to) };
    }

    const cryptoPrices = await prisma.cryptoPrice.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query?.limit || 100,
    });

    // Group by symbol for latest prices
    const latestPrices = new Map<string, any>();
    cryptoPrices.forEach(price => {
      if (!latestPrices.has(price.symbol)) {
        latestPrices.set(price.symbol, price);
      }
    });

    return ApiResponseBuilder.success({
      prices: Array.from(latestPrices.values()),
      count: latestPrices.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return ApiResponseBuilder.internalError('Failed to fetch crypto prices');
  }
}

// GET /api/v1/market/historical/:symbol
export async function getHistoricalData(
  req: NextRequest,
  params: { symbol: string }
): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const { data: query, error } = validateQueryParams(searchParams, marketDataQuerySchema);

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  try {
    const symbol = params.symbol.toUpperCase();
    const interval = query?.interval || '1d';
    
    // Determine if it's a stock or crypto
    const isStock = !['BTC', 'ETH', 'SOL'].includes(symbol);

    if (isStock) {
      const data = await getStockHistoricalData(symbol, query);
      return ApiResponseBuilder.success(data);
    } else {
      const data = await getCryptoHistoricalData(symbol, query);
      return ApiResponseBuilder.success(data);
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return ApiResponseBuilder.internalError('Failed to fetch historical data');
  }
}

// GET /api/v1/market/feed
export async function getMarketFeed(req: NextRequest): Promise<NextResponse> {
  try {
    // Get latest stock and crypto prices
    const [stocks, cryptos, topMovers] = await Promise.all([
      prisma.marketData.findMany({
        orderBy: { timestamp: 'desc' },
        distinct: ['ticker'],
        take: 20,
      }),
      prisma.cryptoPrice.findMany({
        orderBy: { timestamp: 'desc' },
        distinct: ['symbol'],
      }),
      getTopMovers(),
    ]);

    // Get market summary
    const marketSummary = await getMarketSummary();

    return ApiResponseBuilder.success({
      stocks,
      cryptos,
      topMovers,
      summary: marketSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market feed:', error);
    return ApiResponseBuilder.internalError('Failed to fetch market feed');
  }
}

// GET /api/v1/market/alerts
export async function getMarketAlerts(req: NextRequest): Promise<NextResponse> {
  try {
    const alerts = await prisma.alert.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        company: {
          select: {
            ticker: true,
            name: true,
          },
        },
      },
    });

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      ticker: alert.company?.ticker,
      companyName: alert.company?.name,
      threshold: alert.threshold,
      currentValue: alert.currentValue,
      createdAt: alert.createdAt,
      acknowledged: alert.acknowledged,
    }));

    return ApiResponseBuilder.success({
      alerts: formattedAlerts,
      count: formattedAlerts.length,
      hasUnacknowledged: formattedAlerts.some(a => !a.acknowledged),
    });
  } catch (error) {
    console.error('Error fetching market alerts:', error);
    return ApiResponseBuilder.internalError('Failed to fetch market alerts');
  }
}

// Helper functions
async function getStockHistoricalData(ticker: string, query: any) {
  const where: any = { ticker };

  if (query?.from) {
    where.timestamp = { ...where.timestamp, gte: new Date(query.from) };
  }

  if (query?.to) {
    where.timestamp = { ...where.timestamp, lte: new Date(query.to) };
  }

  const data = await prisma.marketData.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: query?.limit || 365,
  });

  // Aggregate by interval if needed
  if (query?.interval && query.interval !== '1d') {
    return aggregateByInterval(data, query.interval);
  }

  return {
    symbol: ticker,
    type: 'stock',
    data: data.map(d => ({
      timestamp: d.timestamp,
      open: d.price,
      high: d.high24h,
      low: d.low24h,
      close: d.price,
      volume: d.volume24h,
      change: d.change24h,
      changePercent: d.change24hPercent,
    })),
  };
}

async function getCryptoHistoricalData(symbol: string, query: any) {
  const where: any = { symbol };

  if (query?.from) {
    where.timestamp = { ...where.timestamp, gte: new Date(query.from) };
  }

  if (query?.to) {
    where.timestamp = { ...where.timestamp, lte: new Date(query.to) };
  }

  const data = await prisma.cryptoPrice.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: query?.limit || 365,
  });

  // Aggregate by interval if needed
  if (query?.interval && query.interval !== '1d') {
    return aggregateByInterval(data, query.interval);
  }

  return {
    symbol,
    type: 'crypto',
    data: data.map(d => ({
      timestamp: d.timestamp,
      price: d.price,
      marketCap: d.marketCap,
      volume: d.volume24h,
      change: d.change24h,
      changePercent: d.change24hPercent,
    })),
  };
}

function aggregateByInterval(data: any[], interval: string) {
  // Simple aggregation logic - in production, use proper time-series aggregation
  const aggregated: any[] = [];
  let currentBucket: any = null;

  data.forEach(point => {
    const bucketKey = getBucketKey(point.timestamp, interval);
    
    if (!currentBucket || currentBucket.key !== bucketKey) {
      if (currentBucket) {
        aggregated.push(currentBucket.data);
      }
      currentBucket = {
        key: bucketKey,
        data: {
          timestamp: point.timestamp,
          open: point.price || point.open,
          high: point.price || point.high,
          low: point.price || point.low,
          close: point.price || point.close,
          volume: 0,
          count: 0,
        },
      };
    }

    currentBucket.data.high = Math.max(currentBucket.data.high, point.price || point.high);
    currentBucket.data.low = Math.min(currentBucket.data.low, point.price || point.low);
    currentBucket.data.close = point.price || point.close;
    currentBucket.data.volume += point.volume || point.volume24h || 0;
    currentBucket.data.count++;
  });

  if (currentBucket) {
    aggregated.push(currentBucket.data);
  }

  return aggregated;
}

function getBucketKey(timestamp: Date, interval: string): string {
  const date = new Date(timestamp);
  switch (interval) {
    case '1m':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    case '5m':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${Math.floor(date.getMinutes() / 5)}`;
    case '15m':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${Math.floor(date.getMinutes() / 15)}`;
    case '1h':
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    default:
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
}

async function getTopMovers() {
  const stocks = await prisma.marketData.findMany({
    orderBy: { change24hPercent: 'desc' },
    distinct: ['ticker'],
    take: 10,
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  const gainers = stocks.slice(0, 5).map(s => ({
    ticker: s.ticker,
    name: s.company?.name,
    price: s.price,
    change: s.change24h,
    changePercent: s.change24hPercent,
  }));

  const losers = stocks.slice(-5).reverse().map(s => ({
    ticker: s.ticker,
    name: s.company?.name,
    price: s.price,
    change: s.change24h,
    changePercent: s.change24hPercent,
  }));

  return { gainers, losers };
}

async function getMarketSummary() {
  const companies = await prisma.company.findMany({
    include: {
      marketData: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
  });

  let totalMarketCap = 0;
  let totalTreasuryValue = 0;
  let companiesUp = 0;
  let companiesDown = 0;

  companies.forEach(company => {
    totalMarketCap += company.marketCap;
    
    if (company.marketData?.[0]?.change24hPercent > 0) {
      companiesUp++;
    } else if (company.marketData?.[0]?.change24hPercent < 0) {
      companiesDown++;
    }
  });

  // Get total treasury value
  const treasuryHoldings = await prisma.treasuryHolding.findMany();
  const cryptoPrices = await prisma.cryptoPrice.findMany({
    orderBy: { timestamp: 'desc' },
    distinct: ['symbol'],
  });

  const priceMap = new Map(cryptoPrices.map(p => [p.symbol, p.price]));
  
  treasuryHoldings.forEach(holding => {
    const price = priceMap.get(holding.crypto) || 0;
    totalTreasuryValue += holding.amount * price;
  });

  return {
    totalMarketCap,
    totalTreasuryValue,
    companiesTracked: companies.length,
    companiesUp,
    companiesDown,
    marketCapChange24h: 0, // Would need historical data
    treasuryValueChange24h: 0, // Would need historical data
  };
}