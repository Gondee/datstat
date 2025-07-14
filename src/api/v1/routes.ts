import { ApiRoute } from '../gateway/router';
import * as companies from './companies';
import * as treasury from './treasury';
import * as market from './market';
import * as analytics from './analytics';

// Company routes
export const companyRoutes: ApiRoute[] = [
  {
    path: '/api/v1/companies',
    method: 'GET',
    handler: companies.getCompanies,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
  {
    path: '/api/v1/companies/:ticker',
    method: 'GET',
    handler: companies.getCompany,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
  {
    path: '/api/v1/companies',
    method: 'POST',
    handler: companies.createCompany,
    auth: { required: true, scopes: ['admin'] },
    rateLimit: { max: 10 },
  },
  {
    path: '/api/v1/companies/:ticker',
    method: 'PUT',
    handler: companies.updateCompany,
    auth: { required: true, scopes: ['admin'] },
    rateLimit: { max: 10 },
  },
  {
    path: '/api/v1/companies/:ticker',
    method: 'DELETE',
    handler: companies.deleteCompany,
    auth: { required: true, scopes: ['admin'] },
    rateLimit: { max: 10 },
  },
];

// Treasury routes
export const treasuryRoutes: ApiRoute[] = [
  {
    path: '/api/v1/treasury',
    method: 'GET',
    handler: treasury.getTreasuryHoldings,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
  {
    path: '/api/v1/treasury/summary',
    method: 'GET',
    handler: treasury.getTreasurySummary,
    auth: { required: false },
    rateLimit: { max: 50 },
  },
  {
    path: '/api/v1/treasury/:ticker/:crypto',
    method: 'GET',
    handler: treasury.getTreasuryHolding,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
  {
    path: '/api/v1/treasury/:ticker/:crypto/transactions',
    method: 'POST',
    handler: treasury.addTreasuryTransaction,
    auth: { required: true, scopes: ['admin'] },
    rateLimit: { max: 10 },
  },
];

// Market data routes
export const marketRoutes: ApiRoute[] = [
  {
    path: '/api/v1/market/stocks',
    method: 'GET',
    handler: market.getStockPrices,
    auth: { required: false },
    rateLimit: { max: 200 },
  },
  {
    path: '/api/v1/market/crypto',
    method: 'GET',
    handler: market.getCryptoPrices,
    auth: { required: false },
    rateLimit: { max: 200 },
  },
  {
    path: '/api/v1/market/historical/:symbol',
    method: 'GET',
    handler: market.getHistoricalData,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
  {
    path: '/api/v1/market/feed',
    method: 'GET',
    handler: market.getMarketFeed,
    auth: { required: false },
    rateLimit: { max: 60 },
  },
  {
    path: '/api/v1/market/alerts',
    method: 'GET',
    handler: market.getMarketAlerts,
    auth: { required: false },
    rateLimit: { max: 100 },
  },
];

// Analytics routes
export const analyticsRoutes: ApiRoute[] = [
  {
    path: '/api/v1/analytics/comprehensive/:ticker',
    method: 'GET',
    handler: analytics.getComprehensiveAnalytics,
    auth: { required: false },
    rateLimit: { max: 50 },
  },
  {
    path: '/api/v1/analytics/comparison',
    method: 'GET',
    handler: analytics.getComparativeAnalytics,
    auth: { required: false },
    rateLimit: { max: 30 },
  },
  {
    path: '/api/v1/analytics/scenarios',
    method: 'GET',
    handler: analytics.getScenarioAnalysis,
    auth: { required: false },
    rateLimit: { max: 30 },
  },
  {
    path: '/api/v1/analytics/rankings',
    method: 'GET',
    handler: analytics.getAnalyticsRankings,
    auth: { required: false },
    rateLimit: { max: 50 },
  },
];

// Export all v1 routes
export const v1Routes: ApiRoute[] = [
  ...companyRoutes,
  ...treasuryRoutes,
  ...marketRoutes,
  ...analyticsRoutes,
];