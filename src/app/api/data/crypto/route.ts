import { NextRequest, NextResponse } from 'next/server';
import { coinMarketCapService } from '@/services/external/apis/coinMarketCapService';
import { logger } from '@/services/external/utils/logger';
import { CryptoType } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') as CryptoType | null;
    const historical = searchParams.get('historical');
    const days = parseInt(searchParams.get('days') || '30');

    logger.info('API', `Crypto data request`, { symbol, historical, days });

    if (historical === 'true') {
      if (!symbol) {
        return NextResponse.json(
          { error: 'Symbol required for historical data' },
          { status: 400 }
        );
      }

      const result = await coinMarketCapService.getHistoricalPrice(symbol, days);
      return NextResponse.json(result);
    }

    if (symbol) {
      // Get single crypto price
      const result = await coinMarketCapService.getCryptoPrice(symbol);
      return NextResponse.json(result);
    } else {
      // Get all crypto prices
      const result = await coinMarketCapService.getAllCryptoPrices();
      return NextResponse.json(result);
    }
  } catch (error) {
    logger.error('API', 'Crypto data fetch failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch crypto data',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Invalid symbols array provided' },
        { status: 400 }
      );
    }

    logger.info('API', `Crypto batch request`, { symbols });

    const results: Record<string, any> = {};
    const errors: string[] = [];

    for (const symbol of symbols) {
      try {
        const result = await coinMarketCapService.getCryptoPrice(symbol as CryptoType);
        results[symbol] = result;
      } catch (error) {
        errors.push(`${symbol}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      success: Object.keys(results).length > 0,
      timestamp: new Date().toISOString(),
      source: 'CoinMarketCap API',
    });
  } catch (error) {
    logger.error('API', 'Crypto batch fetch failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch crypto data',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}