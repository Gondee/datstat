// API route structure for DAT Analytics Platform

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const API_ROUTES = {
  // Company endpoints
  companies: {
    list: '/companies',
    get: (ticker: string) => `/companies/${ticker}`,
    create: '/companies',
    update: (ticker: string) => `/companies/${ticker}`,
    delete: (ticker: string) => `/companies/${ticker}`,
    search: '/companies/search',
    treasury: {
      get: (ticker: string) => `/companies/${ticker}/treasury`,
      update: (ticker: string) => `/companies/${ticker}/treasury`,
      addTransaction: (ticker: string) => `/companies/${ticker}/treasury/transactions`,
    },
    historical: {
      get: (ticker: string, period: string) => `/companies/${ticker}/historical?period=${period}`,
    }
  },

  // Market data endpoints
  market: {
    crypto: {
      list: '/market/crypto',
      get: (symbol: string) => `/market/crypto/${symbol}`,
      historical: (symbol: string, period: string) => `/market/crypto/${symbol}/historical?period=${period}`,
      live: '/market/crypto/live' // WebSocket endpoint
    },
    stocks: {
      quote: (ticker: string) => `/market/stocks/${ticker}/quote`,
      batch: '/market/stocks/batch',
      live: '/market/stocks/live' // WebSocket endpoint
    }
  },

  // Analytics endpoints
  analytics: {
    dashboard: '/analytics/dashboard',
    metrics: {
      premiumToNav: '/analytics/metrics/premium-to-nav',
      treasuryPerformance: '/analytics/metrics/treasury-performance',
      sectorAnalysis: '/analytics/metrics/sector-analysis'
    },
    reports: {
      generate: '/analytics/reports/generate',
      list: '/analytics/reports',
      get: (id: string) => `/analytics/reports/${id}`
    }
  },

  // Data sync endpoints
  sync: {
    companies: '/sync/companies',
    marketData: '/sync/market-data',
    status: '/sync/status',
    schedule: '/sync/schedule'
  },

  // User and settings
  user: {
    profile: '/user/profile',
    preferences: '/user/preferences',
    watchlist: {
      get: '/user/watchlist',
      add: '/user/watchlist',
      remove: (ticker: string) => `/user/watchlist/${ticker}`
    },
    alerts: {
      list: '/user/alerts',
      create: '/user/alerts',
      update: (id: string) => `/user/alerts/${id}`,
      delete: (id: string) => `/user/alerts/${id}`
    }
  },

  // Webhooks for real-time updates
  webhooks: {
    register: '/webhooks/register',
    unregister: (id: string) => `/webhooks/${id}`,
    test: (id: string) => `/webhooks/${id}/test`
  }
};

// Helper function to build full API URLs
export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// WebSocket endpoints
export const WS_ENDPOINTS = {
  marketData: '/ws/market-data',
  companyUpdates: '/ws/company-updates',
  alerts: '/ws/alerts'
};

// API request types
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  cache?: RequestCache;
  revalidate?: number;
}

// Generic API fetch wrapper
export async function apiRequest<T>(
  path: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  const url = buildApiUrl(path);
  const { method = 'GET', headers = {}, body, params } = config;

  // Add query parameters
  const urlWithParams = params
    ? `${url}?${new URLSearchParams(params as any).toString()}`
    : url;

  const response = await fetch(urlWithParams, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: config.cache,
    next: config.revalidate ? { revalidate: config.revalidate } : undefined
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}