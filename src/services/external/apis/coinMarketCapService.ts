import axios, { AxiosInstance } from 'axios';
import { APIResponse, APIServiceConfig, CryptoAPIResponse } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import RateLimiter from '../utils/rateLimiter';
import { CryptoType, CryptoPrice } from '@/types/models';

interface CoinMarketCapAPIResponse {
  data: {
    [key: string]: {
      id: number;
      symbol: string;
      name: string;
      quote: {
        USD: {
          price: number;
          percent_change_24h: number;
          market_cap: number;
          volume_24h: number;
          last_updated: string;
        };
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

class CoinMarketCapService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: APIServiceConfig;
  private readonly serviceName = 'CoinMarketCap';

  constructor() {
    this.config = {
      baseURL: 'https://pro-api.coinmarketcap.com/v1',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerMinute: 333, // Basic plan: 10,000 calls/month ≈ 333/day ≈ 14/hour
        requestsPerHour: 417, // Conservative estimate
        burstLimit: 10,
      },
      cacheTTL: 60, // 1 minute cache for price data (CMC updates every minute)
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'deflate, gzip',
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || '',
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
        
        logger.debug(this.serviceName, `Making request to ${config.url}`, {
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
        logger.debug(this.serviceName, `Response received from ${response.config.url}`, {
          status: response.status,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          logger.warn(this.serviceName, 'Rate limited by API', {
            retryAfter: error.response.headers['retry-after'],
          });
          
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60') * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          
          return this.client.request(error.config);
        }
        
        logger.error(this.serviceName, 'Response error', error, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
        });
        
        return Promise.reject(error);
      }
    );
  }

  private getCoinSymbol(crypto: CryptoType): string {
    return crypto; // CMC uses symbols directly
  }

  async getCryptoPrice(crypto: CryptoType): Promise<APIResponse<CryptoPrice>> {
    const cacheKey = `crypto_price_${crypto}`;
    const cachedData = cache.get<CryptoPrice>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${crypto}`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    try {
      const symbol = this.getCoinSymbol(crypto);
      const response = await this.client.get<CoinMarketCapAPIResponse>('/cryptocurrency/quotes/latest', {
        params: {
          symbol,
          convert: 'USD',
        },
      });

      const data = response.data;
      const coinData = Object.values(data.data)[0];
      const usdQuote = coinData.quote.USD;

      const cryptoPrice: CryptoPrice = {
        symbol: crypto,
        price: usdQuote.price,
        change24h: (usdQuote.price * usdQuote.percent_change_24h) / 100,
        change24hPercent: usdQuote.percent_change_24h,
        marketCap: usdQuote.market_cap,
        volume24h: usdQuote.volume_24h,
        timestamp: new Date().toISOString(),
      };

      cache.set(cacheKey, cryptoPrice, this.config.cacheTTL);
      logger.info(this.serviceName, `Fetched price for ${crypto}`, { price: cryptoPrice.price });

      return {
        data: cryptoPrice,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch price for ${crypto}`, error as Error);
      throw new Error(`Failed to fetch ${crypto} price: ${(error as Error).message}`);
    }
  }

  async getAllCryptoPrices(): Promise<APIResponse<Record<CryptoType, CryptoPrice>>> {
    const cacheKey = 'all_crypto_prices';
    const cachedData = cache.get<Record<CryptoType, CryptoPrice>>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, 'Cache hit for all crypto prices');
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    try {
      const symbols = ['BTC', 'ETH', 'SOL'].join(',');
      const response = await this.client.get<CoinMarketCapAPIResponse>('/cryptocurrency/quotes/latest', {
        params: {
          symbol: symbols,
          convert: 'USD',
        },
      });

      const data = response.data;
      const prices: Record<CryptoType, CryptoPrice> = {} as Record<CryptoType, CryptoPrice>;

      for (const [symbol, coinData] of Object.entries(data.data)) {
        const cryptoType = symbol as CryptoType;
        const usdQuote = coinData.quote.USD;

        prices[cryptoType] = {
          symbol: cryptoType,
          price: usdQuote.price,
          change24h: (usdQuote.price * usdQuote.percent_change_24h) / 100,
          change24hPercent: usdQuote.percent_change_24h,
          marketCap: usdQuote.market_cap,
          volume24h: usdQuote.volume_24h,
          timestamp: new Date().toISOString(),
        };
      }

      cache.set(cacheKey, prices, this.config.cacheTTL);
      logger.info(this.serviceName, 'Fetched all crypto prices', { count: Object.keys(prices).length });

      return {
        data: prices,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, 'Failed to fetch all crypto prices', error as Error);
      throw new Error(`Failed to fetch crypto prices: ${(error as Error).message}`);
    }
  }

  async getHistoricalPrice(crypto: CryptoType, days: number = 30): Promise<APIResponse<Array<{ date: string; price: number }>>> {
    const cacheKey = `crypto_historical_${crypto}_${days}d`;
    const cachedData = cache.get<Array<{ date: string; price: number }>>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${crypto} historical data`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    try {
      const symbol = this.getCoinSymbol(crypto);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const response = await this.client.get('/cryptocurrency/quotes/historical', {
        params: {
          symbol,
          time_start: startDate.toISOString(),
          time_end: endDate.toISOString(),
          interval: days > 30 ? '1d' : '1h',
          convert: 'USD',
        },
      });

      const historicalData = response.data.data.quotes.map((quote: any) => ({
        date: quote.timestamp,
        price: quote.quote.USD.price,
      }));

      // Cache for longer periods for historical data
      const cacheTTL = days > 7 ? 3600 : 300; // 1 hour for longer periods, 5 minutes for recent
      cache.set(cacheKey, historicalData, cacheTTL);
      
      logger.info(this.serviceName, `Fetched ${days}d historical data for ${crypto}`, { 
        points: historicalData.length 
      });

      return {
        data: historicalData,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch historical data for ${crypto}`, error as Error);
      throw new Error(`Failed to fetch historical data: ${(error as Error).message}`);
    }
  }

  getHealthStatus() {
    return {
      service: this.serviceName,
      rateLimitRemaining: this.rateLimiter.getRemainingRequests(this.serviceName),
      rateLimitReset: new Date(this.rateLimiter.getResetTime(this.serviceName)).toISOString(),
      cacheStats: cache.getStats(),
    };
  }
}

export const coinMarketCapService = new CoinMarketCapService();
export default CoinMarketCapService;