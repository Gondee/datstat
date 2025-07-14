import { Company, MarketData, CryptoPrice, CalculatedMetrics, HistoricalDataPoint } from '@/types';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ApiMeta {
  version: string;
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
}

// API Request types
export interface ApiQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  fields?: string[];
}

export interface CompanyQueryParams extends ApiQueryParams {
  sector?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  hasTrading?: boolean;
  search?: string;
}

export interface TreasuryQueryParams extends ApiQueryParams {
  ticker?: string;
  crypto?: string;
  minHolding?: number;
  includeTransactions?: boolean;
}

export interface MarketDataQueryParams extends ApiQueryParams {
  symbols?: string[];
  from?: string;
  to?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
}

export interface AnalyticsQueryParams extends ApiQueryParams {
  ticker: string;
  metrics?: string[];
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  compare?: string[];
}

// API Key Management
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  scopes: string[];
  rateLimit: number;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  active: boolean;
}

// Webhook types
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  failureCount: number;
}

export type WebhookEvent = 
  | 'company.created'
  | 'company.updated'
  | 'company.deleted'
  | 'treasury.updated'
  | 'market.alert'
  | 'analytics.threshold'
  | 'system.error';

export interface WebhookPayload {
  event: WebhookEvent;
  data: any;
  timestamp: string;
  signature: string;
}

// GraphQL types
export interface GraphQLContext {
  user?: any;
  apiKey?: ApiKey;
  dataSources: {
    companyAPI: any;
    treasuryAPI: any;
    marketAPI: any;
    analyticsAPI: any;
  };
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf';

export interface ExportRequest {
  format: ExportFormat;
  data: any;
  template?: string;
  options?: Record<string, any>;
}

// Bulk operations
export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
}

export interface BulkResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// Real-time subscription types
export interface Subscription {
  id: string;
  type: 'company' | 'market' | 'treasury' | 'analytics';
  filters: Record<string, any>;
  callback: (data: any) => void;
}

// API versioning
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  features: string[];
}

// Integration types
export interface Integration {
  id: string;
  type: 'slack' | 'discord' | 'email' | 'zapier' | 'custom';
  config: Record<string, any>;
  active: boolean;
}

// Audit log types
export interface AuditLog {
  id: string;
  userId?: string;
  apiKeyId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}