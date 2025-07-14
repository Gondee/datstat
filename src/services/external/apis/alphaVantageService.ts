import axios, { AxiosInstance } from 'axios';
import { APIResponse, APIServiceConfig, StockAPIResponse } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import RateLimiter from '../utils/rateLimiter';
import { MarketData } from '@/types/models';

class AlphaVantageService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: APIServiceConfig;
  private readonly serviceName = 'AlphaVantage';

  constructor() {
    this.config = {
      baseURL: 'https://www.alphavantage.co/query',
      apiKey: process.env.ALPHA_VANTAGE_API_KEY,
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimit: {
        requestsPerMinute: 5, // Free tier limit
        requestsPerHour: 500,
        burstLimit: 2,
      },
      cacheTTL: 60, // 1 minute cache for stock data
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DatStat/1.0 (Treasury Analytics)',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const canProceed = await this.rateLimiter.checkRateLimit(this.serviceName);
        if (!canProceed) {
          logger.warn(this.serviceName, 'Rate limit exceeded, waiting...');
          await this.rateLimiter.waitForRateLimit(this.serviceName);
        }
        
        logger.debug(this.serviceName, `Making request for ${config.params?.symbol}`, {
          remaining: this.rateLimiter.getRemainingRequests(this.serviceName),
        });
        
        return config;
      },
      (error) => {
        logger.error(this.serviceName, 'Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        // Check for API error messages in response
        if (response.data?.['Error Message']) {
          throw new Error(response.data['Error Message']);
        }
        if (response.data?.['Note']) {
          throw new Error('API rate limit exceeded: ' + response.data['Note']);
        }
        
        logger.debug(this.serviceName, `Response received`, {
          hasData: !!response.data,
          keys: Object.keys(response.data || {}),
        });
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          logger.warn(this.serviceName, 'Rate limited by API');
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          return this.client.request(error.config);
        }
        
        logger.error(this.serviceName, 'Response error', error, {
          status: error.response?.status,
          statusText: error.response?.statusText,
        });
        
        return Promise.reject(error);
      }
    );
  }

  async getStockQuote(symbol: string): Promise<APIResponse<MarketData>> {
    const cacheKey = `stock_quote_${symbol}`;
    const cachedData = cache.get<MarketData>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${symbol}`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    if (!this.config.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.config.apiKey,
        },
      });

      const quote = response.data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data returned from Alpha Vantage');
      }

      const marketData: MarketData = {
        ticker: symbol,
        price: parseFloat(quote['05. price']) || 0,
        change24h: parseFloat(quote['09. change']) || 0,
        change24hPercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
        volume24h: parseInt(quote['06. volume']) || 0,
        high24h: parseFloat(quote['03. high']) || 0,
        low24h: parseFloat(quote['04. low']) || 0,
        timestamp: new Date().toISOString(),
      };

      cache.set(cacheKey, marketData, this.config.cacheTTL);
      logger.info(this.serviceName, `Fetched quote for ${symbol}`, { price: marketData.price });

      return {
        data: marketData,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch quote for ${symbol}`, error as Error);
      throw new Error(`Failed to fetch ${symbol} quote: ${(error as Error).message}`);
    }
  }

  async getMultipleStockQuotes(symbols: string[]): Promise<APIResponse<Record<string, MarketData>>> {
    const cacheKey = `multiple_quotes_${symbols.join(',')}`; 
    const cachedData = cache.get<Record<string, MarketData>>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, 'Cache hit for multiple quotes');
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    const quotes: Record<string, MarketData> = {};
    const errors: string[] = [];

    // Process symbols sequentially to respect rate limits
    for (const symbol of symbols) {
      try {
        const result = await this.getStockQuote(symbol);
        quotes[symbol] = result.data;
        
        // Add delay between requests to avoid rate limiting
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay (5 requests per minute)
        }
      } catch (error) {
        logger.error(this.serviceName, `Failed to fetch quote for ${symbol}`, error as Error);
        errors.push(`${symbol}: ${(error as Error).message}`);
      }
    }

    if (Object.keys(quotes).length === 0) {
      throw new Error(`Failed to fetch any quotes. Errors: ${errors.join(', ')}`);
    }

    // Cache the successful results
    cache.set(cacheKey, quotes, this.config.cacheTTL);
    
    logger.info(this.serviceName, 'Fetched multiple quotes', { 
      successful: Object.keys(quotes).length,
      failed: errors.length,
    });

    return {
      data: quotes,
      success: true,
      timestamp: new Date().toISOString(),
      source: this.serviceName,
    };
  }

  async getIntradayData(symbol: string, interval: string = '5min'): Promise<APIResponse<Array<{ time: string; price: number; volume: number }>>> {
    const cacheKey = `intraday_${symbol}_${interval}`;
    const cachedData = cache.get<Array<{ time: string; price: number; volume: number }>>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${symbol} intraday data`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    if (!this.config.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol,
          interval: interval,
          apikey: this.config.apiKey,
          outputsize: 'compact', // Last 100 data points
        },
      });

      const timeSeries = response.data[`Time Series (${interval})`];
      if (!timeSeries) {
        throw new Error('No intraday data returned from Alpha Vantage');
      }

      const intradayData = Object.entries(timeSeries).map(([time, data]: [string, any]) => ({
        time,
        price: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume']),
      })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      // Cache for shorter period since this is real-time data
      cache.set(cacheKey, intradayData, 300); // 5 minutes
      
      logger.info(this.serviceName, `Fetched intraday data for ${symbol}`, { 
        points: intradayData.length,
        interval,
      });

      return {
        data: intradayData,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch intraday data for ${symbol}`, error as Error);
      throw new Error(`Failed to fetch intraday data: ${(error as Error).message}`);
    }
  }

  async getCompanyOverview(symbol: string): Promise<APIResponse<any>> {
    const cacheKey = `company_overview_${symbol}`;
    const cachedData = cache.get<any>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${symbol} overview`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    if (!this.config.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    try {
      const response = await this.client.get('', {
        params: {
          function: 'OVERVIEW',
          symbol: symbol,
          apikey: this.config.apiKey,
        },
      });

      const overview = response.data;
      if (!overview || !overview.Symbol) {
        throw new Error('No company overview data returned from Alpha Vantage');
      }

      // Cache for longer period since fundamental data changes infrequently
      cache.set(cacheKey, overview, 3600); // 1 hour
      
      logger.info(this.serviceName, `Fetched company overview for ${symbol}`, { 
        name: overview.Name,
        sector: overview.Sector,
      });

      return {
        data: overview,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch company overview for ${symbol}`, error as Error);
      throw new Error(`Failed to fetch company overview: ${(error as Error).message}`);
    }
  }

  getHealthStatus() {
    return {
      service: this.serviceName,
      rateLimitRemaining: this.rateLimiter.getRemainingRequests(this.serviceName),
      rateLimitReset: new Date(this.rateLimiter.getResetTime(this.serviceName)).toISOString(),
      cacheStats: cache.getStats(),
      hasApiKey: !!this.config.apiKey,
    };
  }
}

export const alphaVantageService = new AlphaVantageService();
export default AlphaVantageService;