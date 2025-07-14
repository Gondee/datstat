-- Add performance indexes for optimal query performance

-- Composite indexes for frequently joined queries
CREATE INDEX IF NOT EXISTS idx_market_data_ticker_timestamp ON market_data(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_historical_metrics_company_date ON historical_metrics(companyId, date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_holdings_company_crypto ON treasury_holdings(companyId, crypto);
CREATE INDEX IF NOT EXISTS idx_executive_compensation_company_year ON executive_compensation(companyId, year DESC);

-- Indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_treasury_holdings_current_value ON treasury_holdings(currentValue DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_holdings_unrealized_gain ON treasury_holdings(unrealizedGainPercent DESC);
CREATE INDEX IF NOT EXISTS idx_companies_market_cap ON companies(marketCap DESC);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Indexes for foreign key relationships (if not already created by Prisma)
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_holding ON treasury_transactions(holdingId);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_date ON treasury_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_type ON treasury_transactions(type);

-- Indexes for data source monitoring
CREATE INDEX IF NOT EXISTS idx_data_sources_type_status ON data_sources(type, status);
CREATE INDEX IF NOT EXISTS idx_data_sources_last_sync ON data_sources(lastSync DESC);

-- Partial indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_convertible_debt_outstanding ON convertible_debt(maturityDate) WHERE isOutstanding = true;
CREATE INDEX IF NOT EXISTS idx_warrants_outstanding ON warrants(expirationDate) WHERE isOutstanding = true;

-- Indexes for text search
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING GIN (to_tsvector('english', ticker || ' ' || name));

-- Analyze tables to update statistics
ANALYZE companies;
ANALYZE treasury_holdings;
ANALYZE treasury_transactions;
ANALYZE market_data;
ANALYZE historical_metrics;
ANALYZE capital_structure;
ANALYZE executive_compensation;
ANALYZE data_sources;