import { NextRequest, NextResponse } from 'next/server';
import { coinGeckoService } from '@/services/external/apis/coinGeckoService';
import { alphaVantageService } from '@/services/external/apis/alphaVantageService';
import { secEdgarService } from '@/services/external/apis/secEdgarService';
import { logger } from '@/services/external/utils/logger';
import { cache } from '@/services/external/utils/cache';
import { prisma } from '@/lib/prisma';
import { CryptoType } from '@/types/models';

const TREASURY_COMPANIES = ['MSTR', 'DFDV', 'UPXI', 'SBET'];
const CRYPTO_SYMBOLS: CryptoType[] = ['BTC', 'ETH', 'SOL'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      forceRefresh = false, 
      dataTypes = ['crypto', 'stocks', 'filings'],
      companies = TREASURY_COMPANIES,
      crypto = CRYPTO_SYMBOLS,
    } = body;

    logger.info('API', 'Data refresh initiated', { 
      forceRefresh, 
      dataTypes, 
      companies: companies.length, 
      crypto: crypto.length 
    });

    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      refreshed: {},
      errors: [],
    };

    // Clear cache if force refresh is requested
    if (forceRefresh) {
      cache.clear();
      logger.info('API', 'Cache cleared for force refresh');
    }

    // Refresh crypto prices
    if (dataTypes.includes('crypto')) {
      logger.info('API', 'Refreshing crypto prices');
      try {
        const cryptoResults = await coinGeckoService.getAllCryptoPrices();
        results.refreshed.crypto = {
          success: true,
          count: Object.keys(cryptoResults.data).length,
          data: cryptoResults.data,
        };

        // Update database with new crypto prices
        for (const [symbol, price] of Object.entries(cryptoResults.data)) {
          await prisma.marketData.upsert({
            where: {
              ticker_timestamp: {
                ticker: symbol,
                timestamp: new Date(price.timestamp),
              },
            },
            update: {
              price: price.price,
              change24h: price.change24h,
              change24hPercent: price.change24hPercent,
              volume24h: price.volume24h,
              marketCap: price.marketCap,
              updatedAt: new Date(),
            },
            create: {
              ticker: symbol,
              symbol: symbol as CryptoType,
              price: price.price,
              change24h: price.change24h,
              change24hPercent: price.change24hPercent,
              volume24h: price.volume24h,
              marketCap: price.marketCap,
              timestamp: new Date(price.timestamp),
            },
          });
        }
      } catch (error) {
        results.errors.push(`Crypto refresh failed: ${(error as Error).message}`);
        results.refreshed.crypto = { success: false, error: (error as Error).message };
      }
    }

    // Refresh stock prices
    if (dataTypes.includes('stocks')) {
      logger.info('API', 'Refreshing stock prices');
      try {
        const stockResults = await alphaVantageService.getMultipleStockQuotes(companies);
        results.refreshed.stocks = {
          success: true,
          count: Object.keys(stockResults.data).length,
          data: stockResults.data,
        };

        // Update database with new stock prices
        for (const [symbol, marketData] of Object.entries(stockResults.data)) {
          // Find company by ticker
          const company = await prisma.company.findUnique({
            where: { ticker: symbol },
          });

          if (company) {
            await prisma.marketData.upsert({
              where: {
                ticker_timestamp: {
                  ticker: symbol,
                  timestamp: new Date(marketData.timestamp),
                },
              },
              update: {
                price: marketData.price,
                change24h: marketData.change24h,
                change24hPercent: marketData.change24hPercent,
                volume24h: marketData.volume24h,
                high24h: marketData.high24h,
                low24h: marketData.low24h,
                updatedAt: new Date(),
              },
              create: {
                ticker: symbol,
                companyId: company.id,
                price: marketData.price,
                change24h: marketData.change24h,
                change24hPercent: marketData.change24hPercent,
                volume24h: marketData.volume24h,
                high24h: marketData.high24h,
                low24h: marketData.low24h,
                timestamp: new Date(marketData.timestamp),
              },
            });

            // Update company's last updated timestamp
            await prisma.company.update({
              where: { id: company.id },
              data: { lastUpdated: new Date() },
            });
          }
        }
      } catch (error) {
        results.errors.push(`Stock refresh failed: ${(error as Error).message}`);
        results.refreshed.stocks = { success: false, error: (error as Error).message };
      }
    }

    // Refresh SEC filings (slower operation, run separately)
    if (dataTypes.includes('filings')) {
      logger.info('API', 'Refreshing SEC filings');
      const filingResults: any = {};
      
      for (const ticker of companies) {
        try {
          const filingsResponse = await secEdgarService.getRecentQuarterlyFilings(ticker);
          filingResults[ticker] = {
            success: true,
            count: filingsResponse.data.length,
            latestFiling: filingsResponse.data[0]?.filingDate || null,
          };

          // Add delay between SEC requests to respect rate limits
          if (companies.indexOf(ticker) < companies.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
          }
        } catch (error) {
          filingResults[ticker] = { 
            success: false, 
            error: (error as Error).message 
          };
          results.errors.push(`SEC filings for ${ticker} failed: ${(error as Error).message}`);
        }
      }
      
      results.refreshed.filings = filingResults;
    }

    // Update data source health status
    await prisma.dataSource.upsert({
      where: { name: 'CoinGecko' },
      update: {
        status: results.refreshed.crypto?.success ? 'ACTIVE' : 'ERROR',
        lastSync: new Date(),
        errorCount: results.refreshed.crypto?.success ? 0 : 1,
        lastError: results.refreshed.crypto?.error || null,
      },
      create: {
        name: 'CoinGecko',
        type: 'CRYPTO_PRICE_API',
        url: 'https://api.coingecko.com/api/v3',
        status: results.refreshed.crypto?.success ? 'ACTIVE' : 'ERROR',
        lastSync: new Date(),
        syncFrequency: '30s',
        errorCount: results.refreshed.crypto?.success ? 0 : 1,
        lastError: results.refreshed.crypto?.error || null,
      },
    });

    await prisma.dataSource.upsert({
      where: { name: 'AlphaVantage' },
      update: {
        status: results.refreshed.stocks?.success ? 'ACTIVE' : 'ERROR',
        lastSync: new Date(),
        errorCount: results.refreshed.stocks?.success ? 0 : 1,
        lastError: results.refreshed.stocks?.error || null,
      },
      create: {
        name: 'AlphaVantage',
        type: 'STOCK_PRICE_API',
        url: 'https://www.alphavantage.co/query',
        status: results.refreshed.stocks?.success ? 'ACTIVE' : 'ERROR',
        lastSync: new Date(),
        syncFrequency: '1m',
        errorCount: results.refreshed.stocks?.success ? 0 : 1,
        lastError: results.refreshed.stocks?.error || null,
      },
    });

    // Determine overall success
    results.success = results.errors.length === 0 || 
      (results.refreshed.crypto?.success || results.refreshed.stocks?.success);

    logger.info('API', 'Data refresh completed', { 
      success: results.success,
      errorCount: results.errors.length,
    });

    return NextResponse.json(results);
  } catch (error) {
    logger.error('API', 'Data refresh failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Data refresh failed',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get health status of all data sources
    const cryptoHealth = coinGeckoService.getHealthStatus();
    const stockHealth = alphaVantageService.getHealthStatus();
    const filingHealth = secEdgarService.getHealthStatus();

    // Get database health status
    const dataSources = await prisma.dataSource.findMany({
      select: {
        name: true,
        type: true,
        status: true,
        lastSync: true,
        errorCount: true,
        lastError: true,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: {
        coinGecko: cryptoHealth,
        alphaVantage: stockHealth,
        secEdgar: filingHealth,
      },
      dataSources,
      cacheStats: cache.getStats(),
    });
  } catch (error) {
    logger.error('API', 'Health check failed', error as Error);
    return NextResponse.json(
      { 
        error: 'Health check failed',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}