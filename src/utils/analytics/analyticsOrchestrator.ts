/**
 * Analytics Orchestrator
 * Coordinates all analytics engines for comprehensive analysis
 */

import { Company, CryptoPrice, CalculatedMetrics } from '@/types';
import { getPrismaClient } from '@/lib/db';
import { InstitutionalMetricsEngine } from '../institutionalMetrics';
import EnhancedNAVEngine from './mNavEngine';
import CryptoYieldEngine from './cryptoYieldEngine';
import DilutionEngine from './dilutionEngine';
import RiskEngine from './riskEngine';
import ComparativeEngine from './comparativeEngine';
import FinancialHealthEngine from './financialHealthEngine';

export interface ComprehensiveAnalytics {
  ticker: string;
  timestamp: Date;
  nav: any;
  cryptoYield: any;
  dilution: any;
  risk: any;
  financialHealth: any;
  institutionalMetrics: CalculatedMetrics;
}

export interface ComparativeAnalyticsResult {
  timestamp: Date;
  companies: string[];
  comparative: any;
  rankings: any;
  efficiencyFrontier: any;
  peerInsights: any;
}

export interface ScenarioAnalysisResult {
  ticker: string;
  timestamp: Date;
  baseCase: any;
  scenarios: Array<{
    name: string;
    assumptions: any;
    impacts: any;
    probability: number;
  }>;
  recommendations: string[];
}

export class AnalyticsOrchestrator {
  private prisma = getPrismaClient();
  private metricsEngine = new InstitutionalMetricsEngine();
  private navEngine = new EnhancedNAVEngine();
  private yieldEngine = new CryptoYieldEngine();
  private dilutionEngine = new DilutionEngine();
  private riskEngine = new RiskEngine();
  private comparativeEngine = new ComparativeEngine();
  private healthEngine = new FinancialHealthEngine();

  /**
   * Get comprehensive analytics for a single company
   */
  async getComprehensiveAnalytics(
    ticker: string,
    includeHistorical: boolean = true
  ): Promise<ComprehensiveAnalytics> {
    // Fetch company data
    const company = await this.fetchCompanyData(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    // Fetch market data
    const cryptoPrices = await this.fetchCryptoPrices();
    const stockPrice = await this.fetchStockPrice(ticker);
    
    // Fetch historical data if requested
    let historicalData = [];
    if (includeHistorical) {
      historicalData = await this.fetchHistoricalData(ticker);
    }

    // Calculate all analytics
    const [
      nav,
      cryptoYield,
      dilution,
      risk,
      institutionalMetrics,
      financialHealth
    ] = await Promise.all([
      this.navEngine.calculateRealTimeNAV(company, cryptoPrices, stockPrice),
      this.yieldEngine.calculateCryptoYield(company),
      this.dilutionEngine.analyzeDilution(company, stockPrice),
      this.riskEngine.calculateRiskMetrics(company, historicalData, cryptoPrices),
      this.calculateInstitutionalMetrics(company, historicalData),
      this.healthEngine.calculateFinancialHealth(company, await this.calculateInstitutionalMetrics(company, historicalData), historicalData)
    ]);

    // Save NAV time series
    await this.navEngine.saveNAVTimeSeries(ticker, nav);

    return {
      ticker,
      timestamp: new Date(),
      nav,
      cryptoYield,
      dilution,
      risk,
      financialHealth,
      institutionalMetrics
    };
  }

  /**
   * Get comparative analytics across multiple companies
   */
  async getComparativeAnalytics(
    tickers?: string[]
  ): Promise<ComparativeAnalyticsResult> {
    // Fetch all companies if no tickers specified
    const companies = await this.fetchCompanies(tickers);
    
    // Calculate metrics for all companies
    const metricsMap = new Map<string, CalculatedMetrics>();
    const historicalDataMap = new Map<string, any[]>();

    await Promise.all(
      companies.map(async (company) => {
        const historicalData = await this.fetchHistoricalData(company.ticker);
        const metrics = await this.calculateInstitutionalMetrics(company, historicalData);
        
        metricsMap.set(company.ticker, metrics);
        historicalDataMap.set(company.ticker, historicalData);
      })
    );

    // Perform comparative analysis
    const comparative = await this.comparativeEngine.performComparativeAnalysis(
      companies,
      metricsMap,
      historicalDataMap
    );

    return {
      timestamp: new Date(),
      companies: companies.map(c => c.ticker),
      comparative: comparative,
      rankings: comparative.rankings,
      efficiencyFrontier: comparative.efficiencyFrontier,
      peerInsights: {
        averages: comparative.peerGroup.groupMetrics,
        outliers: comparative.peerGroup.outliers,
        correlations: comparative.correlations
      }
    };
  }

  /**
   * Run scenario analysis
   */
  async runScenarioAnalysis(
    ticker: string,
    scenarios: Array<{
      name: string;
      btcPrice?: number;
      ethPrice?: number;
      solPrice?: number;
      assumptions?: any;
    }>
  ): Promise<ScenarioAnalysisResult> {
    const company = await this.fetchCompanyData(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const currentPrices = await this.fetchCryptoPrices();
    const stockPrice = await this.fetchStockPrice(ticker);
    const baseNav = await this.navEngine.calculateRealTimeNAV(company, currentPrices, stockPrice);

    // Generate base case
    const baseMetrics = await this.calculateInstitutionalMetrics(company, []);
    const baseCase = {
      nav: baseNav,
      metrics: baseMetrics,
      risk: await this.riskEngine.calculateRiskMetrics(company, [], currentPrices)
    };

    // Run scenarios
    const scenarioResults = await Promise.all(
      scenarios.map(async (scenario) => {
        // Create scenario prices
        const scenarioPrices = currentPrices.map(price => {
          if (price.symbol === 'BTC' && scenario.btcPrice) {
            return { ...price, price: scenario.btcPrice };
          }
          if (price.symbol === 'ETH' && scenario.ethPrice) {
            return { ...price, price: scenario.ethPrice };
          }
          if (price.symbol === 'SOL' && scenario.solPrice) {
            return { ...price, price: scenario.solPrice };
          }
          return price;
        });

        // Calculate scenario impacts
        const scenarioNav = await this.navEngine.calculateRealTimeNAV(company, scenarioPrices, stockPrice);
        const navImpact = ((scenarioNav.assumedDilutedNAVPerShare - baseNav.assumedDilutedNAVPerShare) / 
                          baseNav.assumedDilutedNAVPerShare) * 100;

        // Estimate other impacts
        const treasuryImpact = ((scenarioNav.components.treasuryValue - baseNav.components.treasuryValue) /
                              baseNav.components.treasuryValue) * 100;
        
        const stockImpact = treasuryImpact * 1.5; // Assume 1.5x leverage

        return {
          name: scenario.name,
          assumptions: {
            btcPrice: scenario.btcPrice,
            ethPrice: scenario.ethPrice,
            solPrice: scenario.solPrice,
            ...scenario.assumptions
          },
          impacts: {
            navPerShare: scenarioNav.assumedDilutedNAVPerShare,
            navImpact,
            treasuryImpact,
            estimatedStockImpact: stockImpact,
            premiumDiscountChange: scenarioNav.premiumDiscount.toAssumedDilutedNAVPercent - 
                                 baseNav.premiumDiscount.toAssumedDilutedNAVPercent
          },
          probability: this.estimateScenarioProbability(scenario.name, treasuryImpact)
        };
      })
    );

    // Generate recommendations
    const recommendations = this.generateScenarioRecommendations(scenarioResults, baseCase);

    return {
      ticker,
      timestamp: new Date(),
      baseCase,
      scenarios: scenarioResults,
      recommendations
    };
  }

  /**
   * Get real-time NAV updates
   */
  async getRealTimeNAV(ticker: string): Promise<any> {
    const company = await this.fetchCompanyData(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const cryptoPrices = await this.fetchCryptoPrices();
    const stockPrice = await this.fetchStockPrice(ticker);
    
    const nav = await this.navEngine.calculateRealTimeNAV(company, cryptoPrices, stockPrice);
    
    // Get NAV projections
    const projections = this.navEngine.generateNAVProjections(company, nav, [
      { name: 'Bull Case', btcPrice: 100000, ethPrice: 10000, solPrice: 500 },
      { name: 'Base Case', btcPrice: 70000, ethPrice: 5000, solPrice: 200 },
      { name: 'Bear Case', btcPrice: 30000, ethPrice: 2000, solPrice: 50 }
    ]);

    return {
      current: nav,
      projections,
      timestamp: new Date()
    };
  }

  /**
   * Get crypto yield analysis
   */
  async getCryptoYieldAnalysis(
    ticker: string,
    timeFrame: 'quarterly' | 'yearly' = 'yearly'
  ): Promise<any> {
    const company = await this.fetchCompanyData(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    return await this.yieldEngine.calculateCryptoYield(company, timeFrame);
  }

  /**
   * Get risk assessment
   */
  async getRiskAssessment(ticker: string): Promise<any> {
    const company = await this.fetchCompanyData(ticker);
    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    const historicalData = await this.fetchHistoricalData(ticker);
    const cryptoPrices = await this.fetchCryptoPrices();
    
    return await this.riskEngine.calculateRiskMetrics(company, historicalData, cryptoPrices);
  }

  // Helper methods
  private async fetchCompanyData(ticker: string): Promise<Company | null> {
    const companyData = await this.prisma.companies.findUnique({
      where: { ticker },
      include: {
        treasury_holdings: {
          include: {
            transactions: true
          }
        }
      }
    });

    if (!companyData) return null;

    // Transform to Company type
    return this.transformToCompany(companyData);
  }

  private async fetchCompanies(tickers?: string[]): Promise<Company[]> {
    const companiesData = await this.prisma.companies.findMany({
      where: tickers ? { ticker: { in: tickers } } : undefined,
      include: {
        treasury_holdings: {
          include: {
            transactions: true
          }
        }
      }
    });

    return companiesData.map(c => this.transformToCompany(c));
  }

  private async fetchCryptoPrices(): Promise<CryptoPrice[]> {
    // In production, this would fetch from real-time data
    return [
      { symbol: 'BTC', price: 70000, change24h: 1000, change24hPercent: 1.5, marketCap: 1400000000000, volume24h: 30000000000, timestamp: new Date().toISOString() },
      { symbol: 'ETH', price: 5000, change24h: 100, change24hPercent: 2.0, marketCap: 600000000000, volume24h: 15000000000, timestamp: new Date().toISOString() },
      { symbol: 'SOL', price: 200, change24h: 5, change24hPercent: 2.5, marketCap: 80000000000, volume24h: 2000000000, timestamp: new Date().toISOString() }
    ];
  }

  private async fetchStockPrice(ticker: string): Promise<number> {
    // In production, fetch from real-time data
    const company = await this.prisma.companies.findUnique({
      where: { ticker },
      select: { market_cap: true, shares_outstanding: true }
    });

    if (!company) return 0;
    return company.market_cap / company.shares_outstanding;
  }

  private async fetchHistoricalData(ticker: string): Promise<any[]> {
    const data = await this.prisma.historical_metrics.findMany({
      where: { 
        ticker,
        date: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      },
      orderBy: { date: 'asc' }
    });

    return data.map(d => ({
      date: d.date.toISOString(),
      stockPrice: d.stock_price || 0,
      treasuryValue: d.treasury_value || 0,
      navPerShare: d.nav_per_share || 0,
      premiumToNav: d.premium_to_nav || 0,
      volume: d.volume || 0,
      sharesOutstanding: d.shares_outstanding || 0,
      sharesDiluted: d.shares_diluted || 0,
      cryptoYield: d.crypto_yield || 0,
      impliedVolatility: d.implied_volatility || 0,
      beta: d.beta || 0,
      institutionalOwnership: d.institutional_ownership || 0,
      shortInterest: d.short_interest || 0,
      borrowCost: d.borrow_cost || 0
    }));
  }

  private async calculateInstitutionalMetrics(
    company: Company,
    historicalData: any[]
  ): Promise<CalculatedMetrics> {
    return InstitutionalMetricsEngine.calculateComprehensiveMetrics(company, historicalData);
  }

  private transformToCompany(data: any): Company {
    // Transform Prisma data to Company type
    // This is a simplified version - in production would handle all fields properly
    return {
      ticker: data.ticker,
      name: data.name,
      description: data.description || '',
      sector: data.sector || 'Technology',
      marketCap: data.market_cap,
      sharesOutstanding: data.shares_outstanding,
      shareholdersEquity: data.shareholders_equity || 0,
      totalDebt: data.total_debt || 0,
      treasury: data.treasury_holdings.map((h: any) => ({
        crypto: h.crypto_type,
        amount: h.amount,
        averageCostBasis: h.average_cost_basis,
        totalCost: h.total_cost,
        currentValue: h.current_value,
        unrealizedGain: h.unrealized_gain,
        unrealizedGainPercent: h.unrealized_gain_percent,
        transactions: h.transactions || [],
        stakingYield: h.staking_yield,
        stakedAmount: h.staked_amount
      })),
      lastUpdated: data.updated_at.toISOString(),
      capitalStructure: {
        sharesBasic: data.shares_outstanding,
        sharesDilutedCurrent: data.shares_outstanding * 1.1,
        sharesDilutedAssumed: data.shares_outstanding * 1.2,
        sharesFloat: data.shares_outstanding * 0.8,
        sharesInsiderOwned: data.shares_outstanding * 0.15,
        sharesInstitutionalOwned: data.shares_outstanding * 0.4,
        weightedAverageShares: data.shares_outstanding,
        convertibleDebt: [],
        warrants: [],
        stockOptions: data.shares_outstanding * 0.05,
        restrictedStockUnits: data.shares_outstanding * 0.03,
        performanceStockUnits: data.shares_outstanding * 0.02
      },
      executiveCompensation: [],
      businessModel: {
        revenueStreams: ['Treasury Management', 'Legacy Business'],
        operatingRevenue: 50000000,
        operatingExpenses: 40000000,
        cashBurnRate: 1000000,
        isTreasuryFocused: true,
        legacyBusinessValue: 100000000
      },
      governance: {
        boardSize: 7,
        independentDirectors: 5,
        ceoFounder: false,
        votingRights: 'Single Class',
        auditFirm: 'Big Four'
      }
    };
  }

  private estimateScenarioProbability(name: string, impact: number): number {
    if (name.toLowerCase().includes('bull')) return 0.25;
    if (name.toLowerCase().includes('bear')) return 0.20;
    if (name.toLowerCase().includes('crash')) return 0.10;
    if (name.toLowerCase().includes('base')) return 0.45;
    return 0.33;
  }

  private generateScenarioRecommendations(scenarios: any[], baseCase: any): string[] {
    const recommendations: string[] = [];
    
    // Analyze downside scenarios
    const downsideScenarios = scenarios.filter(s => s.impacts.treasuryImpact < -20);
    if (downsideScenarios.length > 0) {
      recommendations.push('Consider hedging strategies to protect against significant treasury declines');
    }

    // Check for high impact scenarios
    const highImpactScenarios = scenarios.filter(s => Math.abs(s.impacts.navImpact) > 30);
    if (highImpactScenarios.length > 0) {
      recommendations.push('High sensitivity to crypto prices suggests need for diversification');
    }

    // Upside capture
    const upsideScenarios = scenarios.filter(s => s.impacts.treasuryImpact > 50);
    if (upsideScenarios.length > 0) {
      recommendations.push('Position maintains strong upside exposure to crypto rally');
    }

    return recommendations;
  }
}

export default AnalyticsOrchestrator;