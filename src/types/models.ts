export type CryptoType = 'BTC' | 'ETH' | 'SOL';
export type FundingMethod = 'equity' | 'convertible_debt' | 'credit_facility' | 'pipe' | 'at_the_market';
export type CompensationType = 'cash' | 'equity' | 'options' | 'crypto' | 'performance_units';

export interface TreasuryTransaction {
  id: string;
  date: string;
  amount: number;
  pricePerUnit: number;
  totalCost: number;
  type: 'purchase' | 'sale' | 'stake' | 'unstake';
  fundingMethod?: FundingMethod;
  notes?: string;
}

// New interfaces for institutional data
export interface ConvertibleDebt {
  id: string;
  issueDate: string;
  maturityDate: string;
  principal: number;
  interestRate: number;
  conversionPrice: number;
  conversionRatio: number;
  currentValue: number;
  isOutstanding: boolean;
  notes?: string;
}

export interface Warrant {
  id: string;
  issueDate: string;
  expirationDate: string;
  strikePrice: number;
  sharesPerWarrant: number;
  totalWarrants: number;
  isOutstanding: boolean;
  notes?: string;
}

export interface ExecutiveCompensation {
  name: string;
  title: string;
  cashCompensation: number;
  equityCompensation: number;
  cryptoCompensation?: number;
  totalCompensation: number;
  sharesOwned: number;
  optionsOutstanding: number;
  year: number;
}

export interface CapitalStructure {
  sharesBasic: number;
  sharesDilutedCurrent: number;
  sharesDilutedAssumed: number;
  sharesFloat: number;
  sharesInsiderOwned: number;
  sharesInstitutionalOwned: number;
  weightedAverageShares: number;
  convertibleDebt: ConvertibleDebt[];
  warrants: Warrant[];
  stockOptions: number;
  restrictedStockUnits: number;
  performanceStockUnits: number;
}

export interface TreasuryHolding {
  crypto: CryptoType;
  amount: number;
  averageCostBasis: number;
  totalCost: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  transactions: TreasuryTransaction[];
  stakingYield?: number;
  stakedAmount?: number;
}

export interface Company {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  marketCap: number;
  sharesOutstanding: number;
  shareholdersEquity: number;
  totalDebt: number;
  treasury: TreasuryHolding[];
  lastUpdated: string;
  
  // Enhanced institutional data
  capitalStructure: CapitalStructure;
  executiveCompensation: ExecutiveCompensation[];
  businessModel: {
    revenueStreams: string[];
    operatingRevenue: number;
    operatingExpenses: number;
    cashBurnRate: number;
    isTreasuryFocused: boolean;
    legacyBusinessValue: number;
  };
  governance: {
    boardSize: number;
    independentDirectors: number;
    ceoFounder: boolean;
    votingRights: string;
    auditFirm: string;
  };
}

export interface MarketData {
  ticker: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

export interface CryptoPrice {
  symbol: CryptoType;
  price: number;
  change24h: number;
  change24hPercent: number;
  marketCap: number;
  volume24h: number;
  timestamp: string;
}

export interface CalculatedMetrics {
  ticker: string;
  treasuryValue: number;
  treasuryValuePerShare: number;
  navPerShare: number;
  stockPrice: number;
  premiumToNav: number;
  premiumToNavPercent: number;
  debtToTreasuryRatio: number;
  treasuryConcentration: {
    [key in CryptoType]?: number;
  };
  
  // Advanced institutional metrics
  cryptoYield: {
    btcYield?: number;
    ethYield?: number;
    solYield?: number;
    totalCryptoYield: number;
  };
  
  dilutionMetrics: {
    dilutionRate: number;
    shareCountGrowth: number;
    treasuryAccretionRate: number;
    dilutionAdjustedReturn: number;
  };
  
  riskMetrics: {
    impliedVolatility: number;
    beta: number;
    treasuryConcentrationRisk: number;
    liquidityRisk: number;
    debtServiceCoverage: number;
  };
  
  capitalEfficiency: {
    capitalAllocationScore: number;
    treasuryROI: number;
    costOfCapital: number;
    capitalTurnover: number;
  };
  
  operationalMetrics: {
    revenueDiversification: number;
    operatingLeverage: number;
    treasuryFocusRatio: number;
    cashBurnCoverage: number;
  };
}

export interface HistoricalDataPoint {
  date: string;
  stockPrice: number;
  treasuryValue: number;
  navPerShare: number;
  premiumToNav: number;
  volume: number;
  
  // Enhanced historical tracking
  sharesOutstanding: number;
  sharesDiluted: number;
  cryptoYield: number;
  impliedVolatility: number;
  beta: number;
  institutionalOwnership: number;
  shortInterest: number;
  borrowCost: number;
}

export interface CompanyWithMetrics extends Company {
  marketData: MarketData;
  metrics: CalculatedMetrics;
  historicalData?: HistoricalDataPoint[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  relatedTickers: string[];
  category: 'crypto' | 'company' | 'market' | 'regulation' | 'technology';
  sentiment: 'positive' | 'negative' | 'neutral';
}

// Professional analysis interfaces
export interface ScenarioAnalysis {
  name: string;
  cryptoPriceChange: number;
  stockPriceImpact: number;
  treasuryValueImpact: number;
  liquidationPressure: number;
  debtServiceRisk: number;
}

export interface PeerComparison {
  metric: string;
  company: string;
  value: number;
  rank: number;
  percentile: number;
}

export interface RiskAssessment {
  liquidityRisk: 'low' | 'medium' | 'high';
  concentrationRisk: 'low' | 'medium' | 'high';
  dilutionRisk: 'low' | 'medium' | 'high';
  operationalRisk: 'low' | 'medium' | 'high';
  regulatoryRisk: 'low' | 'medium' | 'high';
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number;
}

export interface ArbitrageOpportunity {
  type: 'premium_discount' | 'volatility' | 'pairs_trade' | 'convertible_arb';
  description: string;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
  confidence: number;
}

export interface InstitutionalMetrics {
  shareholderComposition: {
    retail: number;
    institutional: number;
    insider: number;
    hedgeFunds: number;
  };
  tradingMetrics: {
    averageDailyVolume: number;
    volumeWeightedAveragePrice: number;
    bidAskSpread: number;
    daysSalesOutstanding: number;
  };
  optionsActivity: {
    putCallRatio: number;
    impliedVolatilityRank: number;
    openInterest: number;
    maxPain: number;
  };
}