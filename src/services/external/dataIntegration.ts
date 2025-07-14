import { prisma } from '@/lib/prisma';
import { coinGeckoService } from './apis/coinGeckoService';
import { alphaVantageService } from './apis/alphaVantageService';
import { secEdgarService } from './apis/secEdgarService';
import { logger } from './utils/logger';
import { cache } from './utils/cache';
import { CryptoType, MarketData, CryptoPrice } from '@/types/models';

export interface IntegrationConfig {
  enableAutoRefresh: boolean;
  refreshIntervals: {
    crypto: number; // milliseconds
    stocks: number;
    filings: number;
  };
  maxRetries: number;
  fallbackEnabled: boolean;
}

export interface DataSourceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdate: string;
  errorRate: number;
  latency: number;
}

class DataIntegrationService {
  private config: IntegrationConfig;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<IntegrationConfig>) {
    this.config = {
      enableAutoRefresh: true,
      refreshIntervals: {
        crypto: 30000, // 30 seconds
        stocks: 60000, // 1 minute
        filings: 3600000, // 1 hour
      },
      maxRetries: 3,
      fallbackEnabled: true,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('DataIntegration', 'Initializing data integration service');

    try {
      // Verify database connection
      await prisma.$connect();
      
      // Initialize data sources in database
      await this.initializeDataSources();
      
      // Start auto-refresh if enabled
      if (this.config.enableAutoRefresh) {
        this.startAutoRefresh();
      }

      this.isInitialized = true;
      logger.info('DataIntegration', 'Data integration service initialized successfully');
    } catch (error) {
      logger.error('DataIntegration', 'Failed to initialize data integration service', error as Error);
      throw error;
    }
  }

  private async initializeDataSources(): Promise<void> {
    const dataSources = [
      {
        name: 'CoinGecko',
        type: 'CRYPTO_PRICE_API',
        url: 'https://api.coingecko.com/api/v3',
        syncFrequency: '30s',
      },
      {
        name: 'AlphaVantage',
        type: 'STOCK_PRICE_API',
        url: 'https://www.alphavantage.co/query',
        syncFrequency: '1m',
      },
      {
        name: 'SEC_EDGAR',
        type: 'FILING_DATA',
        url: 'https://data.sec.gov',
        syncFrequency: '1h',
      },
    ];

    for (const source of dataSources) {
      await prisma.dataSource.upsert({
        where: { name: source.name },
        update: {
          url: source.url,
          syncFrequency: source.syncFrequency,
          updatedAt: new Date(),
        },
        create: {
          name: source.name,
          type: source.type as any,
          url: source.url,
          status: 'ACTIVE',
          syncFrequency: source.syncFrequency,
          errorCount: 0,
        },
      });
    }
  }

  private startAutoRefresh(): void {
    logger.info('DataIntegration', 'Starting auto-refresh timers');

    // Crypto price refresh
    const cryptoTimer = setInterval(async () => {
      await this.refreshCryptoPrices();
    }, this.config.refreshIntervals.crypto);
    this.refreshTimers.set('crypto', cryptoTimer);

    // Stock price refresh
    const stockTimer = setInterval(async () => {
      await this.refreshStockPrices();
    }, this.config.refreshIntervals.stocks);
    this.refreshTimers.set('stocks', stockTimer);

    // SEC filings refresh (less frequent)
    const filingsTimer = setInterval(async () => {
      await this.refreshFilings();
    }, this.config.refreshIntervals.filings);
    this.refreshTimers.set('filings', filingsTimer);

    // Initial data fetch
    setTimeout(() => {
      this.refreshCryptoPrices();
      this.refreshStockPrices();
    }, 5000); // Wait 5 seconds before initial fetch
  }

  async refreshCryptoPrices(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.debug('DataIntegration', 'Refreshing crypto prices');
      
      const result = await coinGeckoService.getAllCryptoPrices();
      
      // Update database
      for (const [symbol, price] of Object.entries(result.data)) {
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

      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('CoinGecko', 'ACTIVE', null, latency);
      
      logger.info('DataIntegration', 'Crypto prices refreshed successfully', {
        count: Object.keys(result.data).length,
        latency,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('CoinGecko', 'ERROR', (error as Error).message, latency);
      logger.error('DataIntegration', 'Failed to refresh crypto prices', error as Error);
    }
  }

  async refreshStockPrices(): Promise<void> {
    const startTime = Date.now();
    const tickers = ['MSTR', 'DFDV', 'UPXI', 'SBET'];
    
    try {
      logger.debug('DataIntegration', 'Refreshing stock prices');
      
      const result = await alphaVantageService.getMultipleStockQuotes(tickers);
      
      // Update database
      for (const [symbol, marketData] of Object.entries(result.data)) {
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

          await prisma.company.update({
            where: { id: company.id },
            data: { lastUpdated: new Date() },
          });
        }
      }

      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('AlphaVantage', 'ACTIVE', null, latency);
      
      logger.info('DataIntegration', 'Stock prices refreshed successfully', {
        count: Object.keys(result.data).length,
        latency,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('AlphaVantage', 'ERROR', (error as Error).message, latency);
      logger.error('DataIntegration', 'Failed to refresh stock prices', error as Error);
    }
  }

  async refreshFilings(): Promise<void> {
    const startTime = Date.now();
    const tickers = ['MSTR', 'DFDV', 'UPXI', 'SBET'];
    
    try {
      logger.debug('DataIntegration', 'Refreshing SEC filings');
      
      for (const ticker of tickers) {
        try {
          await secEdgarService.getRecentQuarterlyFilings(ticker);
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (error) {
          logger.warn('DataIntegration', `Failed to refresh filings for ${ticker}`, {
            error: (error as Error).message,
          });
        }
      }

      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('SEC_EDGAR', 'ACTIVE', null, latency);
      
      logger.info('DataIntegration', 'SEC filings refreshed successfully', { latency });
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.updateDataSourceStatus('SEC_EDGAR', 'ERROR', (error as Error).message, latency);
      logger.error('DataIntegration', 'Failed to refresh SEC filings', error as Error);
    }
  }

  private async updateDataSourceStatus(
    name: string,
    status: 'ACTIVE' | 'ERROR' | 'MAINTENANCE',
    errorMessage?: string | null,
    latency?: number
  ): Promise<void> {
    try {
      const dataSource = await prisma.dataSource.findUnique({
        where: { name },
      });

      if (dataSource) {
        await prisma.dataSource.update({
          where: { name },
          data: {
            status,
            lastSync: new Date(),
            errorCount: status === 'ERROR' ? dataSource.errorCount + 1 : 0,
            lastError: errorMessage,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('DataIntegration', `Failed to update status for ${name}`, error as Error);
    }
  }

  async getDataSourceHealth(): Promise<DataSourceStatus[]> {
    try {
      const dataSources = await prisma.dataSource.findMany();
      
      return dataSources.map(source => ({
        name: source.name,
        status: this.mapStatus(source.status),
        lastUpdate: source.lastSync?.toISOString() || 'Never',
        errorRate: source.errorCount || 0,
        latency: 0, // Would need to track this separately
      }));
    } catch (error) {
      logger.error('DataIntegration', 'Failed to get data source health', error as Error);
      return [];
    }
  }

  private mapStatus(status: string): 'healthy' | 'degraded' | 'down' {
    switch (status) {
      case 'ACTIVE':
        return 'healthy';
      case 'ERROR':
        return 'down';
      case 'MAINTENANCE':
        return 'degraded';
      default:
        return 'down';
    }
  }

  async getTreasuryData(ticker: string): Promise<any> {
    try {
      const company = await prisma.company.findUnique({
        where: { ticker },
        include: {
          treasuryHoldings: {
            include: {
              transactions: {
                orderBy: { date: 'desc' },
                take: 10,
              },
            },
          },
          marketData: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      if (!company) {
        throw new Error(`Company not found: ${ticker}`);
      }

      // Get crypto prices for treasury valuation
      const cryptoSymbols = company.treasuryHoldings.map(h => h.crypto);
      const cryptoPrices: Record<string, CryptoPrice> = {};
      
      for (const symbol of cryptoSymbols) {
        try {
          const result = await coinGeckoService.getCryptoPrice(symbol);
          cryptoPrices[symbol] = result.data;
        } catch (error) {
          logger.warn('DataIntegration', `Failed to get price for ${symbol}`, {
            error: (error as Error).message,
          });
        }
      }

      // Calculate current treasury values
      const updatedHoldings = company.treasuryHoldings.map(holding => {
        const currentPrice = cryptoPrices[holding.crypto]?.price || 0;
        const currentValue = holding.amount * currentPrice;
        const unrealizedGain = currentValue - holding.totalCost;
        const unrealizedGainPercent = holding.totalCost > 0 
          ? (unrealizedGain / holding.totalCost) * 100 
          : 0;

        return {
          ...holding,
          currentValue,
          unrealizedGain,
          unrealizedGainPercent,
        };
      });

      return {
        company: {
          ...company,
          treasuryHoldings: updatedHoldings,
        },
        cryptoPrices,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('DataIntegration', `Failed to get treasury data for ${ticker}`, error as Error);
      throw error;
    }
  }

  stopAutoRefresh(): void {
    logger.info('DataIntegration', 'Stopping auto-refresh timers');
    
    for (const [name, timer] of this.refreshTimers) {
      clearInterval(timer);
      logger.debug('DataIntegration', `Stopped timer: ${name}`);
    }
    
    this.refreshTimers.clear();
  }

  async destroy(): Promise<void> {
    logger.info('DataIntegration', 'Destroying data integration service');
    
    this.stopAutoRefresh();
    cache.destroy();
    await prisma.$disconnect();
    
    this.isInitialized = false;
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableAutoRefresh && this.isInitialized) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    } else if (!this.config.enableAutoRefresh) {
      this.stopAutoRefresh();
    }
  }
}

// Singleton instance
export const dataIntegrationService = new DataIntegrationService();
export default DataIntegrationService;