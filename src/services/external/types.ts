// External API service types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: string;
  source: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface APIServiceConfig {
  baseURL: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimit: RateLimitConfig;
  cacheTTL: number; // Cache time-to-live in seconds
}

export interface CryptoAPIResponse {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

export interface StockAPIResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: string;
}

export interface SECFilingResponse {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: boolean;
  isInlineXBRL: boolean;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface CompanyFilingsResponse {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing?: {
      street1: string;
      street2?: string;
      city: string;
      stateOrCountry: string;
      zipCode: string;
      stateOrCountryDescription: string;
    };
    business?: {
      street1: string;
      street2?: string;
      city: string;
      stateOrCountry: string;
      zipCode: string;
      stateOrCountryDescription: string;
    };
  };
  phone: string;
  flags: string;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

export interface DataHealth {
  source: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccessfulUpdate: string;
  errorCount: number;
  latency: number;
  uptime: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface WebSocketMessage {
  type: 'price_update' | 'connection_status' | 'error';
  data: any;
  timestamp: string;
}