import { getCompanyByTicker, getCompanyHistoricalData } from '@/lib/database-utils';
import { CompanyWithRelations } from '@/lib/database-utils';
import { 
  FinancialHealthEngine, 
  RiskEngine,
  CryptoYieldEngine,
  EnhancedNAVEngine,
  DilutionEngine,
  ComparativeEngine
} from '@/utils/analytics';
import { CryptoType } from '@/types';
import { queryCache, CacheKeyGenerator } from '@/lib/performance/cache-utils';

export class AnalyticsService {
  private financialHealthEngine = new FinancialHealthEngine();
  private riskEngine = new RiskEngine();
  private cryptoYieldEngine = new CryptoYieldEngine();
  private mNavEngine = new EnhancedNAVEngine();
  private dilutionEngine = new DilutionEngine();
  private comparativeEngine = new ComparativeEngine();

  /**
   * Get comprehensive analytics for a company
   */
  async getComprehensiveAnalytics(ticker: string) {
    const cacheKey = CacheKeyGenerator.generateForQuery('analytics', 'comprehensive', { ticker });
    
    // Check cache first
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Fetch company data
      const company = await getCompanyByTicker(ticker);
      if (!company) {
        throw new Error(`Company ${ticker} not found`);
      }

      // Get historical data for calculations
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const rawHistoricalData = await getCompanyHistoricalData(ticker, startDate, endDate);
      
      // Transform historical data to match the expected format
      const historicalData = rawHistoricalData.map(data => ({
        date: data.date.toISOString(),
        stockPrice: data.stockPrice,
        treasuryValue: data.treasuryValue,
        navPerShare: data.navPerShare,
        premiumToNav: data.premiumToNav,
        volume: data.volume,
        sharesOutstanding: data.sharesOutstanding,
        sharesDiluted: data.sharesDiluted,
        cryptoYield: data.cryptoYield,
        impliedVolatility: data.impliedVolatility || 0,
        beta: data.beta || 0,
        institutionalOwnership: data.institutionalOwnership || 0,
        shortInterest: data.shortInterest || 0,
        borrowCost: data.borrowCost || 0
      }));

      // Transform company data for analytics engines
      const companyData = this.transformCompanyData(company);
      
      // Get current crypto prices (mock for now)
      const cryptoPrices = {
        BTC: 45000,
        ETH: 2500,
        SOL: 100,
        AVAX: 35,
        MATIC: 0.8
      };

      // Calculate all analytics in parallel
      const [
        financialHealth,
        riskAnalysis,
        yieldTracking,
        mNavAnalysis,
        dilutionAnalysis
      ] = await Promise.all([
        this.financialHealthEngine.calculateFinancialHealth(
          companyData, 
          companyData.metrics, 
          historicalData
        ),
        this.riskEngine.calculateRiskMetrics(companyData, historicalData, [], undefined),
        this.cryptoYieldEngine.calculateCryptoYield(companyData),
        this.mNavEngine.calculateRealTimeNAV(companyData, [], companyData.marketData.price),
        this.dilutionEngine.analyzeDilution(companyData, companyData.marketData.price)
      ]);

      const result = {
        ticker: ticker.toUpperCase(),
        timestamp: new Date().toISOString(),
        financialHealth,
        riskAnalysis,
        yieldTracking,
        mNavAnalysis,
        dilutionAnalysis,
        summary: {
          overallScore: financialHealth.overallScore,
          riskLevel: riskAnalysis.overallRisk.level,
          currentYield: yieldTracking.currentYield.totalYieldPercent,
          mNavPerShare: mNavAnalysis.current.mNavPerShare,
          potentialDilution: dilutionAnalysis.currentDilution.dilutionPercent
        }
      };

      // Cache for 5 minutes
      queryCache.set(cacheKey, result, 5 * 60 * 1000);
      
      return result;
    } catch (error) {
      console.error(`Failed to get analytics for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get risk analytics for a company
   */
  async getRiskAnalytics(ticker: string) {
    const cacheKey = CacheKeyGenerator.generateForQuery('analytics', 'risk', { ticker });
    
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const company = await getCompanyByTicker(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const companyData = this.transformCompanyData(company);
    const cryptoPrices = await this.getCurrentCryptoPrices();
    
    const riskAnalysis = await this.riskEngine.calculateRiskMetrics(companyData, [], [], undefined);
    
    queryCache.set(cacheKey, riskAnalysis, 10 * 60 * 1000);
    return riskAnalysis;
  }

  /**
   * Get yield analytics for a company
   */
  async getYieldAnalytics(ticker: string) {
    const cacheKey = CacheKeyGenerator.generateForQuery('analytics', 'yield', { ticker });
    
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const company = await getCompanyByTicker(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const companyData = this.transformCompanyData(company);
    const yieldTracking = await this.cryptoYieldEngine.calculateCryptoYield(companyData);
    
    queryCache.set(cacheKey, yieldTracking, 15 * 60 * 1000);
    return yieldTracking;
  }

  /**
   * Get mNAV analytics for a company
   */
  async getMNavAnalytics(ticker: string) {
    const cacheKey = CacheKeyGenerator.generateForQuery('analytics', 'mnav', { ticker });
    
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const company = await getCompanyByTicker(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const companyData = this.transformCompanyData(company);
    const cryptoPrices = await this.getCurrentCryptoPrices();
    
    const mNavAnalysis = await this.mNavEngine.calculateRealTimeNAV(companyData, [], companyData.marketData.price);
    
    queryCache.set(cacheKey, mNavAnalysis, 5 * 60 * 1000);
    return mNavAnalysis;
  }

  /**
   * Get comparative analytics for multiple companies
   */
  async getComparativeAnalytics(tickers: string[]) {
    const cacheKey = CacheKeyGenerator.generateForQuery('analytics', 'comparative', { tickers });
    
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const companies = await Promise.all(
      tickers.map(ticker => getCompanyByTicker(ticker))
    );

    const validCompanies = companies.filter(c => c !== null) as CompanyWithRelations[];
    const companyData = validCompanies.map(c => this.transformCompanyData(c));
    
    const comparison = await this.comparativeEngine.compareCompanies(companyData);
    
    queryCache.set(cacheKey, comparison, 10 * 60 * 1000);
    return comparison;
  }

  /**
   * Transform database company to analytics format
   */
  private transformCompanyData(dbCompany: CompanyWithRelations) {
    // Calculate treasury value
    const treasuryValue = dbCompany.treasuryHoldings.reduce(
      (sum, holding) => sum + holding.currentValue,
      0
    );
    
    // Get latest market data
    const latestMarketData = dbCompany.marketData[0] || {
      price: 0,
      change24h: 0,
      change24hPercent: 0,
      volume24h: 0
    };
    
    // Calculate metrics
    const navPerShare = (dbCompany.shareholdersEquity + treasuryValue) / dbCompany.sharesOutstanding;
    const premiumToNav = latestMarketData.price - navPerShare;
    const premiumToNavPercent = (premiumToNav / navPerShare) * 100;
    
    return {
      id: dbCompany.id,
      ticker: dbCompany.ticker,
      name: dbCompany.name,
      description: dbCompany.description || '',
      sector: dbCompany.sector,
      sharesOutstanding: dbCompany.sharesOutstanding,
      shareholdersEquity: dbCompany.shareholdersEquity,
      totalDebt: dbCompany.totalDebt,
      marketCap: dbCompany.marketCap,
      lastUpdated: dbCompany.lastUpdated.toISOString(),
      treasury: dbCompany.treasuryHoldings.map(h => ({
        crypto: h.crypto,
        amount: h.amount,
        averageCostBasis: h.averageCostBasis,
        totalCost: h.totalCost,
        currentValue: h.currentValue,
        unrealizedGain: h.unrealizedGain,
        unrealizedGainPercent: h.unrealizedGainPercent,
        stakingYield: h.stakingYield || undefined,
        stakedAmount: h.stakedAmount || undefined,
        transactions: []
      })),
      marketData: {
        ticker: dbCompany.ticker,
        price: latestMarketData.price,
        change24h: latestMarketData.change24h,
        change24hPercent: latestMarketData.change24hPercent,
        volume24h: latestMarketData.volume24h,
        high24h: latestMarketData.high24h || latestMarketData.price,
        low24h: latestMarketData.low24h || latestMarketData.price,
        timestamp: new Date().toISOString()
      },
      metrics: {
        ticker: dbCompany.ticker,
        treasuryValue,
        treasuryValuePerShare: treasuryValue / dbCompany.sharesOutstanding,
        navPerShare,
        stockPrice: latestMarketData.price,
        premiumToNav,
        premiumToNavPercent,
        debtToTreasuryRatio: treasuryValue > 0 ? dbCompany.totalDebt / treasuryValue : 0,
        treasuryConcentration: dbCompany.treasuryHoldings.reduce((acc, holding) => {
          acc[holding.crypto] = (holding.currentValue / treasuryValue) * 100;
          return acc;
        }, {} as { [key in CryptoType]?: number }),
        cryptoYield: {
          btcYield: 0,
          ethYield: 0,
          solYield: 0,
          totalCryptoYield: 0
        },
        dilutionMetrics: {
          dilutionRate: 0,
          shareCountGrowth: 0,
          treasuryAccretionRate: 0,
          dilutionAdjustedReturn: 0
        },
        riskMetrics: {
          impliedVolatility: 0,
          beta: 0,
          treasuryConcentrationRisk: 0,
          liquidityRisk: 0,
          debtServiceCoverage: 0
        },
        capitalEfficiency: {
          capitalAllocationScore: 0,
          treasuryROI: 0,
          costOfCapital: 0,
          capitalTurnover: 0
        },
        operationalMetrics: {
          revenueDiversification: 0,
          operatingLeverage: 0,
          treasuryFocusRatio: 0,
          cashBurnCoverage: 0
        }
      },
      capitalStructure: dbCompany.capitalStructure ? {
        sharesBasic: dbCompany.capitalStructure.sharesBasic,
        sharesDilutedCurrent: dbCompany.capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: dbCompany.capitalStructure.sharesDilutedAssumed,
        sharesFloat: dbCompany.capitalStructure.sharesFloat,
        sharesInsiderOwned: dbCompany.capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: dbCompany.capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: dbCompany.capitalStructure.weightedAverageShares,
        stockOptions: dbCompany.capitalStructure.stockOptions,
        restrictedStockUnits: dbCompany.capitalStructure.restrictedStockUnits,
        performanceStockUnits: dbCompany.capitalStructure.performanceStockUnits,
        convertibleDebt: dbCompany.capitalStructure.convertibleDebt.map(d => ({
          issueDate: d.issueDate,
          maturityDate: d.maturityDate,
          principal: d.principal,
          interestRate: d.interestRate,
          conversionPrice: d.conversionPrice,
          conversionRatio: d.conversionRatio,
          currentValue: d.currentValue,
          isOutstanding: d.isOutstanding,
          notes: d.notes || ''
        })),
        warrants: dbCompany.capitalStructure.warrants.map(w => ({
          issueDate: w.issueDate,
          expirationDate: w.expirationDate,
          strikePrice: w.strikePrice,
          totalWarrants: w.totalWarrants,
          sharesPerWarrant: w.sharesPerWarrant,
          isOutstanding: w.isOutstanding,
          notes: w.notes || ''
        }))
      } : {
        sharesBasic: dbCompany.sharesOutstanding,
        sharesDilutedCurrent: dbCompany.sharesOutstanding,
        sharesDilutedAssumed: dbCompany.sharesOutstanding,
        sharesFloat: dbCompany.sharesOutstanding * 0.8,
        sharesInsiderOwned: dbCompany.sharesOutstanding * 0.15,
        sharesInstitutionalOwned: dbCompany.sharesOutstanding * 0.65,
        weightedAverageShares: dbCompany.sharesOutstanding,
        stockOptions: 0,
        restrictedStockUnits: 0,
        performanceStockUnits: 0,
        convertibleDebt: [],
        warrants: []
      },
      executiveCompensation: dbCompany.executiveCompensation?.map(exec => ({
        name: exec.name,
        title: exec.title,
        year: exec.year,
        cashCompensation: exec.cashCompensation,
        equityCompensation: exec.equityCompensation,
        cryptoCompensation: exec.cryptoCompensation || 0,
        totalCompensation: exec.totalCompensation,
        sharesOwned: exec.sharesOwned,
        sharesOwnership: 0,
        optionsOutstanding: exec.optionsOutstanding
      })) || [],
      businessModel: {
        revenueStreams: [],
        operatingRevenue: 0,
        operatingExpenses: 0,
        cashBurnRate: 0,
        isTreasuryFocused: true,
        legacyBusinessValue: 0
      },
      governance: {
        boardSize: 0,
        independentDirectors: 0,
        ceoFounder: false,
        votingRights: 'standard',
        auditFirm: ''
      }
    };
  }

  /**
   * Get current crypto prices (mock for now)
   */
  private async getCurrentCryptoPrices() {
    // In production, this would fetch from market data API
    return {
      BTC: 45000,
      ETH: 2500,
      SOL: 100,
      AVAX: 35,
      MATIC: 0.8,
      DOT: 6.5,
      LINK: 15,
      UNI: 6,
      AAVE: 85,
      SUSHI: 1.2
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();