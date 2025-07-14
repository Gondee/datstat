import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get latest crypto prices from database
    const cryptoPrices = await prisma.marketData.findMany({
      where: {
        symbol: { in: ['BTC', 'ETH', 'SOL'] },
        companyId: null // Crypto prices have no companyId
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol']
    });

    // Get latest stock prices for companies
    const stockPrices = await prisma.marketData.findMany({
      where: {
        companyId: { not: null }
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['ticker'],
      include: {
        company: {
          select: {
            ticker: true,
            name: true
          }
        }
      }
    });

    // Transform crypto prices to expected format
    const cryptoData = cryptoPrices.reduce((acc, price) => {
      if (price.symbol) {
        acc[price.symbol] = {
          symbol: price.symbol,
          price: price.price,
          change24h: price.change24h,
          change24hPercent: price.change24hPercent,
          marketCap: price.marketCap || 0,
          volume24h: price.volume24h,
          timestamp: price.timestamp.toISOString()
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // Transform stock prices to expected format
    const stockData = stockPrices.reduce((acc, price) => {
      acc[price.ticker] = {
        ticker: price.ticker,
        price: price.price,
        change24h: price.change24h,
        change24hPercent: price.change24hPercent,
        volume24h: price.volume24h,
        high24h: price.high24h || 0,
        low24h: price.low24h || 0,
        timestamp: price.timestamp.toISOString(),
        company: price.company
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: {
        crypto: cryptoData,
        stocks: stockData,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}