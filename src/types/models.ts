export type CryptoType = 'BTC' | 'ETH' | 'SOL';

export interface TreasuryTransaction {
  id: string;
  date: string;
  amount: number;
  pricePerUnit: number;
  totalCost: number;
  type: 'purchase' | 'sale' | 'stake' | 'unstake';
  notes?: string;
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
}

export interface HistoricalDataPoint {
  date: string;
  stockPrice: number;
  treasuryValue: number;
  navPerShare: number;
  premiumToNav: number;
  volume: number;
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