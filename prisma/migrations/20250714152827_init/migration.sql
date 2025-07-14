-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CryptoType" AS ENUM ('BTC', 'ETH', 'SOL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'SALE', 'STAKE', 'UNSTAKE');

-- CreateEnum
CREATE TYPE "FundingMethod" AS ENUM ('EQUITY', 'CONVERTIBLE_DEBT', 'CREDIT_FACILITY', 'PIPE', 'AT_THE_MARKET');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('CRYPTO_PRICE_API', 'STOCK_PRICE_API', 'TREASURY_DATA', 'FILING_DATA', 'NEWS_API', 'MARKET_DATA');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "sharesOutstanding" DOUBLE PRECISION NOT NULL,
    "shareholdersEquity" DOUBLE PRECISION NOT NULL,
    "totalDebt" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revenueStreams" TEXT[],
    "operatingRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatingExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashBurnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTreasuryFocused" BOOLEAN NOT NULL DEFAULT false,
    "legacyBusinessValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boardSize" INTEGER NOT NULL DEFAULT 0,
    "independentDirectors" INTEGER NOT NULL DEFAULT 0,
    "ceoFounder" BOOLEAN NOT NULL DEFAULT false,
    "votingRights" TEXT,
    "auditFirm" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_holdings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "crypto" "CryptoType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "averageCostBasis" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "unrealizedGain" DOUBLE PRECISION NOT NULL,
    "unrealizedGainPercent" DOUBLE PRECISION NOT NULL,
    "stakingYield" DOUBLE PRECISION,
    "stakedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "holdingId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "fundingMethod" "FundingMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyId" TEXT,
    "symbol" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "change24hPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "high24h" DOUBLE PRECISION,
    "low24h" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_structure" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sharesBasic" DOUBLE PRECISION NOT NULL,
    "sharesDilutedCurrent" DOUBLE PRECISION NOT NULL,
    "sharesDilutedAssumed" DOUBLE PRECISION NOT NULL,
    "sharesFloat" DOUBLE PRECISION NOT NULL,
    "sharesInsiderOwned" DOUBLE PRECISION NOT NULL,
    "sharesInstitutionalOwned" DOUBLE PRECISION NOT NULL,
    "weightedAverageShares" DOUBLE PRECISION NOT NULL,
    "stockOptions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "restrictedStockUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceStockUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convertible_debt" (
    "id" TEXT NOT NULL,
    "capitalStructureId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "conversionPrice" DOUBLE PRECISION NOT NULL,
    "conversionRatio" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "isOutstanding" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convertible_debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warrants" (
    "id" TEXT NOT NULL,
    "capitalStructureId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "sharesPerWarrant" DOUBLE PRECISION NOT NULL,
    "totalWarrants" DOUBLE PRECISION NOT NULL,
    "isOutstanding" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executive_compensation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "cashCompensation" DOUBLE PRECISION NOT NULL,
    "equityCompensation" DOUBLE PRECISION NOT NULL,
    "cryptoCompensation" DOUBLE PRECISION,
    "totalCompensation" DOUBLE PRECISION NOT NULL,
    "sharesOwned" DOUBLE PRECISION NOT NULL,
    "optionsOutstanding" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executive_compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_metrics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stockPrice" DOUBLE PRECISION NOT NULL,
    "treasuryValue" DOUBLE PRECISION NOT NULL,
    "navPerShare" DOUBLE PRECISION NOT NULL,
    "premiumToNav" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "sharesOutstanding" DOUBLE PRECISION NOT NULL,
    "sharesDiluted" DOUBLE PRECISION NOT NULL,
    "cryptoYield" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impliedVolatility" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "institutionalOwnership" DOUBLE PRECISION,
    "shortInterest" DOUBLE PRECISION,
    "borrowCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "url" TEXT,
    "apiKey" TEXT,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSync" TIMESTAMP(3),
    "syncFrequency" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ticker_key" ON "companies"("ticker");

-- CreateIndex
CREATE INDEX "companies_ticker_idx" ON "companies"("ticker");

-- CreateIndex
CREATE INDEX "companies_sector_idx" ON "companies"("sector");

-- CreateIndex
CREATE INDEX "companies_lastUpdated_idx" ON "companies"("lastUpdated");

-- CreateIndex
CREATE INDEX "treasury_holdings_companyId_idx" ON "treasury_holdings"("companyId");

-- CreateIndex
CREATE INDEX "treasury_holdings_crypto_idx" ON "treasury_holdings"("crypto");

-- CreateIndex
CREATE INDEX "treasury_holdings_updatedAt_idx" ON "treasury_holdings"("updatedAt");

-- CreateIndex
CREATE INDEX "treasury_transactions_companyId_idx" ON "treasury_transactions"("companyId");

-- CreateIndex
CREATE INDEX "treasury_transactions_date_idx" ON "treasury_transactions"("date");

-- CreateIndex
CREATE INDEX "treasury_transactions_type_idx" ON "treasury_transactions"("type");

-- CreateIndex
CREATE INDEX "market_data_ticker_idx" ON "market_data"("ticker");

-- CreateIndex
CREATE INDEX "market_data_symbol_idx" ON "market_data"("symbol");

-- CreateIndex
CREATE INDEX "market_data_timestamp_idx" ON "market_data"("timestamp");

-- CreateIndex
CREATE INDEX "market_data_companyId_idx" ON "market_data"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "capital_structure_companyId_key" ON "capital_structure"("companyId");

-- CreateIndex
CREATE INDEX "capital_structure_companyId_idx" ON "capital_structure"("companyId");

-- CreateIndex
CREATE INDEX "convertible_debt_capitalStructureId_idx" ON "convertible_debt"("capitalStructureId");

-- CreateIndex
CREATE INDEX "convertible_debt_maturityDate_idx" ON "convertible_debt"("maturityDate");

-- CreateIndex
CREATE INDEX "warrants_capitalStructureId_idx" ON "warrants"("capitalStructureId");

-- CreateIndex
CREATE INDEX "warrants_expirationDate_idx" ON "warrants"("expirationDate");

-- CreateIndex
CREATE INDEX "executive_compensation_companyId_idx" ON "executive_compensation"("companyId");

-- CreateIndex
CREATE INDEX "executive_compensation_year_idx" ON "executive_compensation"("year");

-- CreateIndex
CREATE UNIQUE INDEX "executive_compensation_companyId_name_year_key" ON "executive_compensation"("companyId", "name", "year");

-- CreateIndex
CREATE INDEX "historical_metrics_companyId_idx" ON "historical_metrics"("companyId");

-- CreateIndex
CREATE INDEX "historical_metrics_date_idx" ON "historical_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "historical_metrics_companyId_date_key" ON "historical_metrics"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_name_key" ON "data_sources"("name");

-- CreateIndex
CREATE INDEX "data_sources_type_idx" ON "data_sources"("type");

-- CreateIndex
CREATE INDEX "data_sources_status_idx" ON "data_sources"("status");

-- CreateIndex
CREATE INDEX "data_sources_lastSync_idx" ON "data_sources"("lastSync");

-- AddForeignKey
ALTER TABLE "treasury_holdings" ADD CONSTRAINT "treasury_holdings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "treasury_holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_structure" ADD CONSTRAINT "capital_structure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convertible_debt" ADD CONSTRAINT "convertible_debt_capitalStructureId_fkey" FOREIGN KEY ("capitalStructureId") REFERENCES "capital_structure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warrants" ADD CONSTRAINT "warrants_capitalStructureId_fkey" FOREIGN KEY ("capitalStructureId") REFERENCES "capital_structure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executive_compensation" ADD CONSTRAINT "executive_compensation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_metrics" ADD CONSTRAINT "historical_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
