# DATstat Database Setup

This directory contains the complete database infrastructure for the DATstat platform.

## Overview

The database is built using Prisma ORM with PostgreSQL and includes:

- **Companies**: Core company data with business model and governance information
- **Treasury Holdings**: Real-time crypto positions with valuation metrics
- **Treasury Transactions**: Historical transaction records with funding method tracking
- **Market Data**: Real-time crypto and stock prices with timestamps
- **Capital Structure**: Convertible debt, warrants, and share count data
- **Executive Compensation**: Management compensation tracking
- **Historical Metrics**: Time-series financial metrics for analysis
- **Admin Users**: Authentication and access control
- **Data Sources**: Integration status and health monitoring

## Quick Start

1. **Install dependencies** (already added to package.json):
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Generate Prisma client**:
   ```bash
   npm run db:generate
   ```

4. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed the database**:
   ```bash
   npm run db:seed
   ```

## Database Schema

### Core Tables

#### Companies
- Basic company information (ticker, name, sector, market cap)
- Business model data (revenue streams, operating metrics)
- Governance information (board size, voting rights)

#### Treasury Holdings
- Current crypto positions by company
- Real-time valuation and unrealized gains
- Staking information where applicable

#### Treasury Transactions
- Historical purchase/sale records
- Funding method tracking (equity, debt, etc.)
- Transaction-level details with notes

#### Market Data
- Real-time stock and crypto prices
- 24h change metrics and trading volume
- Historical price tracking with timestamps

#### Capital Structure
- Share counts (basic, diluted, float)
- Ownership breakdown (insider, institutional)
- Convertible debt and warrant details

## Database Connection

The database connection is handled through `/src/lib/prisma.ts` which provides:

- Connection pooling for performance
- Retry logic for resilient operations
- Transaction wrappers for data consistency
- Health check functionality
- Graceful shutdown handling

### Usage Example

```typescript
import { prisma, safeTransaction, withRetry } from '@/lib/prisma';

// Simple query
const companies = await prisma.company.findMany({
  include: {
    treasuryHoldings: true,
    marketData: true,
  },
});

// Safe transaction
await safeTransaction(async (tx) => {
  const company = await tx.company.create({ ... });
  const holding = await tx.treasuryHolding.create({ ... });
  return { company, holding };
});

// Retry on failure
const result = await withRetry(async () => {
  return await prisma.company.findUnique({ ... });
});
```

## Performance Optimizations

The schema includes strategic indexes for:

- Company ticker lookups
- Market data timestamp queries
- Treasury transaction date ranges
- Capital structure relationships
- Historical metrics time-series

## Integration Notes for Other Agents

### API Routes Agent
- Use `/src/lib/prisma.ts` for all database operations
- Leverage the safe transaction wrapper for multi-table operations
- Include error handling with the retry logic

### Real-time Data Agent
- Market data table is optimized for frequent updates
- Use batch operations for bulk price updates
- Timestamp indexes support efficient time-range queries

### Analytics Agent
- Historical metrics table provides time-series data
- Calculated fields are stored for performance
- Complex aggregations can use the transaction wrapper

### UI Components Agent
- Treasury holdings include pre-calculated gains/losses
- Market data provides all necessary display fields
- Relationships are properly set up for efficient joins

## Development Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Push schema changes without migration (dev only)
npm run db:push

# Reset database and re-seed
npm run db:reset

# Open Prisma Studio (database browser)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (development/production)

Optional for data sources:
- `COINGECKO_API_KEY`: For crypto price data
- `ALPHA_VANTAGE_API_KEY`: For stock price data

## Sample Data

The seed script creates:

- 3 sample companies (MSTR, TSLA, COIN)
- Treasury holdings with realistic data
- Historical transactions and market data
- Executive compensation records
- 30 days of historical metrics
- Admin user for testing

Login credentials for development:
- Email: `admin@datstat.com`
- Password: `password`

## Production Considerations

1. **Connection Pooling**: Use PgBouncer or similar
2. **Backup Strategy**: Regular automated backups
3. **Monitoring**: Set up database performance monitoring
4. **Scaling**: Consider read replicas for analytics queries
5. **Security**: Rotate API keys and use environment-specific credentials