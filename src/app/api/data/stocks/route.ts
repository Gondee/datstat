import { NextRequest, NextResponse } from 'next/server';
import { alphaVantageService } from '@/services/external/apis/alphaVantageService';
import { logger } from '@/services/external/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const intraday = searchParams.get('intraday');
    const interval = searchParams.get('interval') || '5min';
    const overview = searchParams.get('overview');

    logger.info('API', `Stock data request`, { symbol, intraday, interval, overview });

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter required' },
        { status: 400 }
      );
    }

    if (overview === 'true') {
      const result = await alphaVantageService.getCompanyOverview(symbol);
      return NextResponse.json(result);
    }

    if (intraday === 'true') {
      const result = await alphaVantageService.getIntradayData(symbol, interval);
      return NextResponse.json(result);
    }

    // Get stock quote
    const result = await alphaVantageService.getStockQuote(symbol);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API', 'Stock data fetch failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock data',
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

    logger.info('API', `Stock batch request`, { symbols });

    const result = await alphaVantageService.getMultipleStockQuotes(symbols);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API', 'Stock batch fetch failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock data',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}