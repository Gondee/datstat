import { prisma } from '@/lib/prisma';
import { logger } from '../external/utils/logger';
import { cache } from '../external/utils/cache';
import { CryptoType, MarketData, CryptoPrice } from '@/types/models';
import EventEmitter from 'events';

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChangeDetectionResult {
  hasChanged: boolean;
  significantChange: boolean;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    percentChange?: number;
  }[];
}

export interface ProcessedData {
  original: any;
  validated: any;
  changes: ChangeDetectionResult;
  derivedMetrics: any;
  timestamp: Date;
}

export interface DataProcessorConfig {
  enableValidation: boolean;
  enableChangeDetection: boolean;
  enableDerivedMetrics: boolean;
  significantChangeThreshold: number; // percentage
  cacheResults: boolean;
  cacheTTL: number; // seconds
}

class DataProcessor extends EventEmitter {
  private config: DataProcessorConfig;
  private validators: Map<string, Function> = new Map();
  private metricCalculators: Map<string, Function> = new Map();

  constructor(config?: Partial<DataProcessorConfig>) {
    super();
    this.config = {
      enableValidation: true,
      enableChangeDetection: true,
      enableDerivedMetrics: true,
      significantChangeThreshold: 5.0, // 5% change is significant
      cacheResults: true,
      cacheTTL: 300, // 5 minutes
      ...config,
    };

    this.initializeValidators();
    this.initializeMetricCalculators();
  }

  private initializeValidators(): void {
    // Crypto price validator
    this.validators.set('cryptoPrice', (data: CryptoPrice) => {
      const result: DataValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (!data.symbol || !['BTC', 'ETH', 'SOL'].includes(data.symbol)) {
        result.errors.push(`Invalid crypto symbol: ${data.symbol}`);
        result.isValid = false;
      }

      if (typeof data.price !== 'number' || data.price <= 0) {
        result.errors.push(`Invalid price: ${data.price}`);
        result.isValid = false;
      }

      if (typeof data.change24hPercent === 'number' && Math.abs(data.change24hPercent) > 50) {
        result.warnings.push(`Extreme price change: ${data.change24hPercent}%`);
      }

      if (typeof data.volume24h === 'number' && data.volume24h < 0) {
        result.errors.push(`Negative volume: ${data.volume24h}`);
        result.isValid = false;
      }

      return result;
    });

    // Stock market data validator
    this.validators.set('stockMarketData', (data: MarketData) => {
      const result: DataValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (!data.ticker || typeof data.ticker !== 'string') {
        result.errors.push(`Invalid ticker: ${data.ticker}`);
        result.isValid = false;
      }

      if (typeof data.price !== 'number' || data.price <= 0) {
        result.errors.push(`Invalid price: ${data.price}`);
        result.isValid = false;
      }

      if (typeof data.change24hPercent === 'number' && Math.abs(data.change24hPercent) > 30) {
        result.warnings.push(`Extreme price change: ${data.change24hPercent}%`);
      }

      if (data.high24h && data.low24h && data.high24h < data.low24h) {
        result.errors.push(`High24h (${data.high24h}) cannot be less than low24h (${data.low24h})`);
        result.isValid = false;
      }

      return result;
    });

    // Treasury holding validator
    this.validators.set('treasuryHolding', (data: any) => {
      const result: DataValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (typeof data.amount !== 'number' || data.amount < 0) {
        result.errors.push(`Invalid amount: ${data.amount}`);
        result.isValid = false;
      }

      if (typeof data.averageCostBasis !== 'number' || data.averageCostBasis <= 0) {
        result.errors.push(`Invalid cost basis: ${data.averageCostBasis}`);
        result.isValid = false;
      }

      if (data.stakingYield && (data.stakingYield < 0 || data.stakingYield > 100)) {
        result.warnings.push(`Unusual staking yield: ${data.stakingYield}%`);
      }

      return result;
    });
  }

  private initializeMetricCalculators(): void {
    // Treasury value calculator
    this.metricCalculators.set('treasuryValue', async (companyId: string) => {
      const holdings = await prisma.treasuryHolding.findMany({
        where: { companyId },
      });

      return holdings.reduce((total, holding) => total + holding.currentValue, 0);
    });

    // NAV per share calculator
    this.metricCalculators.set('navPerShare', async (companyId: string) => {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { treasuryHoldings: true },
      });

      if (!company) return 0;

      const treasuryValue = company.treasuryHoldings.reduce(
        (total, holding) => total + holding.currentValue,
        0
      );

      return (company.shareholdersEquity + treasuryValue) / company.sharesOutstanding;
    });

    // Premium to NAV calculator
    this.metricCalculators.set('premiumToNav', async (companyId: string, currentPrice: number) => {
      const navPerShare = await this.metricCalculators.get('navPerShare')!(companyId);
      return navPerShare > 0 ? ((currentPrice / navPerShare) - 1) * 100 : 0;
    });

    // Crypto yield calculator
    this.metricCalculators.set('cryptoYield', async (companyId: string) => {
      const holdings = await prisma.treasuryHolding.findMany({
        where: { companyId },
      });

      if (holdings.length === 0) return 0;

      const totalGain = holdings.reduce((total, holding) => total + holding.unrealizedGain, 0);
      const totalCost = holdings.reduce((total, holding) => total + holding.totalCost, 0);

      return totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    });

    // Dilution calculator
    this.metricCalculators.set('dilutionMetrics', async (companyId: string) => {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { capitalStructure: true },
      });

      if (!company || !company.capitalStructure) return null;

      const basic = company.capitalStructure.sharesBasic;
      const diluted = company.capitalStructure.sharesDilutedCurrent;
      
      return {
        dilutionRatio: basic > 0 ? diluted / basic : 1,
        dilutionPercent: basic > 0 ? ((diluted - basic) / basic) * 100 : 0,
        sharesBasic: basic,
        sharesDiluted: diluted,
      };
    });
  }

  async processCryptoPrice(data: CryptoPrice): Promise<ProcessedData> {
    const startTime = Date.now();
    
    try {
      // Validation
      let validated = data;
      if (this.config.enableValidation) {
        const validation = this.validateData('cryptoPrice', data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        validated = data; // Could apply fixes here
      }

      // Change detection
      let changes: ChangeDetectionResult = { hasChanged: false, significantChange: false, changes: [] };
      if (this.config.enableChangeDetection) {
        changes = await this.detectCryptoChanges(data);
      }

      // Calculate derived metrics
      let derivedMetrics = {};
      if (this.config.enableDerivedMetrics) {
        derivedMetrics = await this.calculateCryptoMetrics(data);
      }

      const processed: ProcessedData = {
        original: data,
        validated,
        changes,
        derivedMetrics,
        timestamp: new Date(),
      };

      // Update database
      await this.updateCryptoInDatabase(validated, derivedMetrics);

      // Cache results
      if (this.config.cacheResults) {
        cache.set(`crypto:${data.symbol}:processed`, processed, this.config.cacheTTL);
      }

      // Emit events
      this.emit('dataProcessed', { type: 'crypto', symbol: data.symbol, processed });
      
      if (changes.significantChange) {
        this.emit('significantChange', { type: 'crypto', symbol: data.symbol, changes });
      }

      logger.debug('DataProcessor', `Processed crypto price: ${data.symbol}`, {
        symbol: data.symbol,
        price: data.price,
        changes: changes.changes.length,
        processingTime: Date.now() - startTime,
      });

      return processed;
    } catch (error) {
      logger.error('DataProcessor', `Failed to process crypto price: ${data.symbol}`, error as Error);
      throw error;
    }
  }

  async processStockMarketData(data: MarketData): Promise<ProcessedData> {
    const startTime = Date.now();
    
    try {
      // Validation
      let validated = data;
      if (this.config.enableValidation) {
        const validation = this.validateData('stockMarketData', data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        validated = data;
      }

      // Change detection
      let changes: ChangeDetectionResult = { hasChanged: false, significantChange: false, changes: [] };
      if (this.config.enableChangeDetection) {
        changes = await this.detectStockChanges(data);
      }

      // Calculate derived metrics
      let derivedMetrics = {};
      if (this.config.enableDerivedMetrics) {
        derivedMetrics = await this.calculateStockMetrics(data);
      }

      const processed: ProcessedData = {
        original: data,
        validated,
        changes,
        derivedMetrics,
        timestamp: new Date(),
      };

      // Update database
      await this.updateStockInDatabase(validated, derivedMetrics);

      // Cache results
      if (this.config.cacheResults) {
        cache.set(`stock:${data.ticker}:processed`, processed, this.config.cacheTTL);
      }

      // Emit events
      this.emit('dataProcessed', { type: 'stock', ticker: data.ticker, processed });
      
      if (changes.significantChange) {
        this.emit('significantChange', { type: 'stock', ticker: data.ticker, changes });
      }

      logger.debug('DataProcessor', `Processed stock data: ${data.ticker}`, {
        ticker: data.ticker,
        price: data.price,
        changes: changes.changes.length,
        processingTime: Date.now() - startTime,
      });

      return processed;
    } catch (error) {
      logger.error('DataProcessor', `Failed to process stock data: ${data.ticker}`, error as Error);
      throw error;
    }
  }

  private validateData(type: string, data: any): DataValidationResult {
    const validator = this.validators.get(type);
    if (!validator) {
      return {
        isValid: false,
        errors: [`No validator found for type: ${type}`],
        warnings: [],
      };
    }

    return validator(data);
  }

  private async detectCryptoChanges(data: CryptoPrice): Promise<ChangeDetectionResult> {
    const cacheKey = `crypto:${data.symbol}:last`;
    const lastData = cache.get(cacheKey) as CryptoPrice;

    if (!lastData) {
      cache.set(cacheKey, data, 3600); // Cache for 1 hour
      return { hasChanged: true, significantChange: false, changes: [] };
    }

    const changes: any[] = [];
    let significantChange = false;

    // Check price change
    if (lastData.price !== data.price) {
      const percentChange = ((data.price - lastData.price) / lastData.price) * 100;
      changes.push({
        field: 'price',
        oldValue: lastData.price,
        newValue: data.price,
        percentChange,
      });

      if (Math.abs(percentChange) >= this.config.significantChangeThreshold) {
        significantChange = true;
      }
    }

    // Check volume change
    if (lastData.volume24h !== data.volume24h) {
      const percentChange = lastData.volume24h > 0 ? 
        ((data.volume24h - lastData.volume24h) / lastData.volume24h) * 100 : 0;
      changes.push({
        field: 'volume24h',
        oldValue: lastData.volume24h,
        newValue: data.volume24h,
        percentChange,
      });

      if (Math.abs(percentChange) >= this.config.significantChangeThreshold * 2) {
        significantChange = true;
      }
    }

    cache.set(cacheKey, data, 3600);

    return {
      hasChanged: changes.length > 0,
      significantChange,
      changes,
    };
  }

  private async detectStockChanges(data: MarketData): Promise<ChangeDetectionResult> {
    const cacheKey = `stock:${data.ticker}:last`;
    const lastData = cache.get(cacheKey) as MarketData;

    if (!lastData) {
      cache.set(cacheKey, data, 3600);
      return { hasChanged: true, significantChange: false, changes: [] };
    }

    const changes: any[] = [];
    let significantChange = false;

    // Check price change
    if (lastData.price !== data.price) {
      const percentChange = ((data.price - lastData.price) / lastData.price) * 100;
      changes.push({
        field: 'price',
        oldValue: lastData.price,
        newValue: data.price,
        percentChange,
      });

      if (Math.abs(percentChange) >= this.config.significantChangeThreshold) {
        significantChange = true;
      }
    }

    cache.set(cacheKey, data, 3600);

    return {
      hasChanged: changes.length > 0,
      significantChange,
      changes,
    };
  }

  private async calculateCryptoMetrics(data: CryptoPrice): Promise<any> {
    return {
      marketCapFormatted: this.formatMarketCap(data.marketCap || 0),
      volumeFormatted: this.formatVolume(data.volume24h),
      priceChangeFormatted: this.formatPriceChange(data.change24h, data.change24hPercent),
      volatility: this.calculateVolatility(data),
      liquidityScore: this.calculateLiquidityScore(data),
    };
  }

  private async calculateStockMetrics(data: MarketData): Promise<any> {
    // Get company for additional calculations
    const company = await prisma.company.findUnique({
      where: { ticker: data.ticker },
      include: { treasuryHoldings: true },
    });

    if (!company) {
      return {};
    }

    const treasuryValue = await this.metricCalculators.get('treasuryValue')!(company.id);
    const navPerShare = await this.metricCalculators.get('navPerShare')!(company.id);
    const premiumToNav = await this.metricCalculators.get('premiumToNav')!(company.id, data.price);
    const cryptoYield = await this.metricCalculators.get('cryptoYield')!(company.id);
    const dilutionMetrics = await this.metricCalculators.get('dilutionMetrics')!(company.id);

    return {
      treasuryValue,
      navPerShare,
      premiumToNav,
      cryptoYield,
      dilutionMetrics,
      priceChangeFormatted: this.formatPriceChange(data.change24h, data.change24hPercent),
      volumeFormatted: this.formatVolume(data.volume24h),
    };
  }

  private async updateCryptoInDatabase(data: CryptoPrice, metrics: any): Promise<void> {
    // Find existing record
    const existing = await prisma.marketData.findFirst({
      where: {
        ticker: data.symbol,
        timestamp: new Date(data.timestamp),
      },
    });

    if (existing) {
      await prisma.marketData.update({
        where: { id: existing.id },
        data: {
          price: data.price,
          change24h: data.change24h,
          change24hPercent: data.change24hPercent,
          volume24h: data.volume24h,
          marketCap: data.marketCap,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.marketData.create({
        data: {
          ticker: data.symbol,
          symbol: data.symbol as CryptoType,
          price: data.price,
          change24h: data.change24h,
          change24hPercent: data.change24hPercent,
          volume24h: data.volume24h,
          marketCap: data.marketCap,
          timestamp: new Date(data.timestamp),
        },
      });
    }
  }

  private async updateStockInDatabase(data: MarketData, metrics: any): Promise<void> {
    const company = await prisma.company.findUnique({
      where: { ticker: data.ticker },
    });

    if (!company) return;

    // Find existing record
    const existing = await prisma.marketData.findFirst({
      where: {
        ticker: data.ticker,
        timestamp: new Date(data.timestamp),
      },
    });

    if (existing) {
      await prisma.marketData.update({
        where: { id: existing.id },
        data: {
          price: data.price,
          change24h: data.change24h,
          change24hPercent: data.change24hPercent,
          volume24h: data.volume24h,
          high24h: data.high24h,
          low24h: data.low24h,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.marketData.create({
        data: {
          ticker: data.ticker,
          companyId: company.id,
          price: data.price,
          change24h: data.change24h,
          change24hPercent: data.change24hPercent,
          volume24h: data.volume24h,
          high24h: data.high24h,
          low24h: data.low24h,
          timestamp: new Date(data.timestamp),
        },
      });
    }

    // Update company's last updated timestamp
    await prisma.company.update({
      where: { id: company.id },
      data: { lastUpdated: new Date() },
    });

    // Create historical metric if we have calculated metrics
    if (metrics.treasuryValue !== undefined) {
      await prisma.historicalMetric.upsert({
        where: {
          companyId_date: {
            companyId: company.id,
            date: new Date(),
          },
        },
        update: {
          stockPrice: data.price,
          treasuryValue: metrics.treasuryValue,
          navPerShare: metrics.navPerShare,
          premiumToNav: metrics.premiumToNav,
          volume: data.volume24h,
          cryptoYield: metrics.cryptoYield,
          updatedAt: new Date(),
        },
        create: {
          companyId: company.id,
          date: new Date(),
          stockPrice: data.price,
          treasuryValue: metrics.treasuryValue,
          navPerShare: metrics.navPerShare,
          premiumToNav: metrics.premiumToNav,
          volume: data.volume24h,
          sharesOutstanding: company.sharesOutstanding,
          sharesDiluted: metrics.dilutionMetrics?.sharesDiluted || company.sharesOutstanding,
          cryptoYield: metrics.cryptoYield,
        },
      });
    }
  }

  // Utility methods for formatting
  private formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toLocaleString()}`;
  }

  private formatPriceChange(change: number, changePercent: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  private calculateVolatility(data: CryptoPrice): number {
    // Simplified volatility calculation based on daily change
    return Math.abs(data.change24hPercent);
  }

  private calculateLiquidityScore(data: CryptoPrice): number {
    // Simplified liquidity score based on volume to market cap ratio
    if (!data.marketCap || data.marketCap === 0) return 0;
    return (data.volume24h / data.marketCap) * 100;
  }

  getConfig(): DataProcessorConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<DataProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('DataProcessor', 'Configuration updated', { config: this.config });
  }
}

// Singleton instance
export const dataProcessor = new DataProcessor();
export default DataProcessor;