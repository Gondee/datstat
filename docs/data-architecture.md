# DAT Analytics Platform - Data Architecture Documentation

## Overview

The DAT Analytics Platform is designed to track and analyze companies that hold cryptocurrency treasuries. The architecture provides real-time data updates, comprehensive analytics, and a scalable foundation for future enhancements.

## Core Data Models

### 1. Company Interface
The main entity representing a company with crypto holdings:
- **Basic Information**: ticker, name, description, sector, exchange
- **Treasury Holdings**: Array of cryptocurrency positions
- **Financial Metrics**: Market cap, revenue, assets, liabilities, etc.
- **Stock Price**: Current and historical pricing data
- **Calculated Metrics**: Premium to NAV, treasury value per share, etc.

### 2. Treasury Holdings
Detailed information about each crypto position:
- **Crypto Type**: BTC, ETH, SOL, MATIC, AVAX, DOT, LINK
- **Amount & Value**: Current holdings and market value
- **Cost Basis**: Purchase price and unrealized gains/losses
- **Transaction History**: Detailed purchase/sale records

### 3. Market Data
Real-time cryptocurrency and stock market information:
- **Crypto Prices**: Price, volume, 24h changes
- **Stock Quotes**: OHLCV data with real-time updates
- **Historical Data**: Time series for analysis and charting

## State Management Strategy

### Zustand Store Architecture
We chose Zustand for state management due to its:
- **Simplicity**: Less boilerplate than Redux
- **TypeScript Support**: Excellent type inference
- **Performance**: Efficient updates and subscriptions
- **Persistence**: Built-in localStorage support

Key store features:
- Company data management
- Real-time market data updates
- User preferences and watchlists
- Filtering and sorting capabilities
- Computed values (filtered/sorted lists)

### React Query Integration
For server state management:
- **Data Fetching**: Centralized API calls with caching
- **Background Refetching**: Automatic data freshness
- **Optimistic Updates**: Instant UI feedback
- **Request Deduplication**: Prevents redundant API calls

## API Route Structure

### RESTful Endpoints
```
/api/companies
  GET    /           - List all companies
  GET    /:ticker    - Get company details
  PUT    /:ticker    - Update company
  
/api/companies/:ticker/treasury
  GET    /           - Get treasury details
  PUT    /           - Update holdings
  POST   /transactions - Add transaction

/api/market
  GET    /crypto     - Crypto market data
  GET    /stocks/:ticker/quote - Stock quote

/api/analytics
  GET    /dashboard  - Dashboard summary
  GET    /metrics/*  - Various analytics
```

### WebSocket Endpoints
```
/ws/market-data     - Real-time price updates
/ws/company-updates - Company data changes
/ws/alerts         - User notifications
```

## Data Update Patterns

### 1. Real-time Updates
- WebSocket connections for live price feeds
- Automatic reconnection with exponential backoff
- Batch updates to prevent UI thrashing

### 2. Polling Strategy
- Configurable intervals based on data type
- Market data: 30-60 seconds
- Company data: 2-5 minutes
- Dashboard: On-demand with 2-minute cache

### 3. Data Freshness
- Visual indicators for data age
- Automatic refresh when data becomes stale
- User-triggered manual refresh options

## Key Metric Calculations

### Premium to NAV
```typescript
Premium = Stock Price - NAV per Share
Premium % = (Premium / NAV per Share) × 100
```

### NAV per Share
```typescript
NAV = Shareholders' Equity + Total Treasury Value
NAV per Share = NAV / Shares Outstanding
```

### Treasury Value per Share
```typescript
Treasury per Share = Total Treasury Value / Shares Outstanding
```

## Mock Data Structure

Four sample companies are provided:
1. **MSTR** (MicroStrategy) - Bitcoin treasury
2. **DFDV** (DeFi Technologies) - Solana treasury
3. **UPXI** (Upxi Network) - Solana treasury
4. **SBET** (SharpLink Gaming) - Ethereum treasury

Each includes realistic financial data and treasury holdings.

## Performance Optimizations

### 1. Data Caching
- React Query cache with configurable TTL
- Zustand persistence for user preferences
- Service worker for offline support (future)

### 2. Batch Updates
- Queue multiple updates before rendering
- Debounced state updates
- Virtual scrolling for large lists

### 3. Code Splitting
- Lazy loading for routes
- Dynamic imports for heavy components
- Separate bundles for vendor libraries

## Security Considerations

### API Security
- Authentication tokens (to be implemented)
- Rate limiting per endpoint
- Input validation and sanitization

### Data Integrity
- Type validation with TypeScript
- Runtime validation for API responses
- Error boundaries for graceful failures

## Future Enhancements

### Planned Features
1. Historical data analysis tools
2. Portfolio tracking and simulation
3. Advanced charting capabilities
4. Mobile app synchronization
5. Multi-currency support
6. Export functionality (CSV, PDF)

### Scalability Considerations
- Database indexing strategies
- Caching layer (Redis)
- CDN for static assets
- Horizontal scaling for WebSocket servers

## Development Guidelines

### Code Organization
```
src/
  types/       - TypeScript interfaces
  api/         - API routes and utilities
  state/       - Zustand store
  hooks/       - Custom React hooks
  utils/       - Helper functions
  components/  - React components
  pages/       - Next.js pages
```

### Best Practices
1. Use TypeScript strictly
2. Implement error boundaries
3. Write unit tests for calculations
4. Document complex algorithms
5. Follow React Query patterns
6. Optimize re-renders with memo

## Conclusion

This architecture provides a solid foundation for the DAT Analytics Platform, balancing performance, maintainability, and scalability. The modular design allows for easy extension and modification as requirements evolve.