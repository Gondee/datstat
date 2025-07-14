import axios, { AxiosInstance } from 'axios';
import { APIResponse, APIServiceConfig, CryptoAPIResponse } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import RateLimiter from '../utils/rateLimiter';
import { CryptoType, CryptoPrice } from '@/types/models';

class CoinGeckoService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: APIServiceConfig;
  private readonly serviceName = 'CoinGecko';

  constructor() {
    this.config = {
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerMinute: 10, // Free tier limit
        requestsPerHour: 500,
        burstLimit: 5,
      },
      cacheTTL: 30, // 30 seconds cache for price data
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

  private getCoinId(crypto: CryptoType): string {
    const mapping: Record<CryptoType, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
    };
    return mapping[crypto];
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
      const coinId = this.getCoinId(crypto);
      const response = await this.client.get<CryptoAPIResponse>(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      });

      const data = response.data;
      const cryptoPrice: CryptoPrice = {
        symbol: crypto,
        price: data.current_price || 0,
        change24h: data.price_change_24h || 0,
        change24hPercent: data.price_change_percentage_24h || 0,
        marketCap: data.market_cap || 0,
        volume24h: data.total_volume || 0,
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
      const coinIds = ['bitcoin', 'ethereum', 'solana'].join(',');
      const response = await this.client.get<CryptoAPIResponse[]>('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinIds,
          order: 'market_cap_desc',
          per_page: 3,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
        },
      });

      const cryptoMapping: Record<string, CryptoType> = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'solana': 'SOL',
      };

      const prices: Record<CryptoType, CryptoPrice> = {} as Record<CryptoType, CryptoPrice>;

      for (const coin of response.data) {
        const symbol = cryptoMapping[coin.id];
        if (symbol) {
          prices[symbol] = {
            symbol,
            price: coin.current_price,
            change24h: coin.price_change_24h,
            change24hPercent: coin.price_change_percentage_24h,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            timestamp: new Date().toISOString(),
          };
        }
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
      const coinId = this.getCoinId(crypto);
      const response = await this.client.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
          interval: days > 30 ? 'daily' : 'hourly',
        },
      });

      const historicalData = response.data.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString(),
        price,
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

export const coinGeckoService = new CoinGeckoService();
export default CoinGeckoService;