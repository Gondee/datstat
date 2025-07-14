export const typeDefs = `
  scalar DateTime
  scalar JSON

  type Query {
    # Company queries
    company(ticker: String!): Company
    companies(
      filter: CompanyFilter
      sort: CompanySort
      pagination: PaginationInput
    ): CompanyConnection!
    
    # Treasury queries
    treasuryHolding(ticker: String!, crypto: CryptoType!): TreasuryHolding
    treasuryHoldings(
      filter: TreasuryFilter
      sort: TreasurySort
      pagination: PaginationInput
    ): TreasuryConnection!
    treasurySummary: TreasurySummary!
    
    # Market data queries
    stockPrice(ticker: String!): MarketData
    cryptoPrice(symbol: CryptoType!): CryptoPrice
    marketFeed: MarketFeed!
    historicalData(
      symbol: String!
      from: DateTime
      to: DateTime
      interval: Interval
    ): HistoricalData!
    
    # Analytics queries
    analytics(ticker: String!): ComprehensiveAnalytics!
    comparison(tickers: [String!]!): ComparativeAnalytics!
    scenarios(ticker: String!): ScenarioAnalysis!
    rankings(metric: RankingMetric!, sector: String): Rankings!
  }

  type Mutation {
    # Admin mutations
    createCompany(input: CreateCompanyInput!): Company!
    updateCompany(ticker: String!, input: UpdateCompanyInput!): Company!
    deleteCompany(ticker: String!): DeleteResult!
    
    addTreasuryTransaction(
      ticker: String!
      crypto: CryptoType!
      transaction: TransactionInput!
    ): TreasuryHolding!
  }

  type Subscription {
    # Real-time subscriptions
    companyUpdated(ticker: String!): Company!
    treasuryUpdated(ticker: String!): [TreasuryHolding!]!
    priceUpdated(symbols: [String!]!): PriceUpdate!
    alertCreated(severity: AlertSeverity): Alert!
  }

  # Company types
  type Company {
    ticker: String!
    name: String!
    description: String
    sector: String!
    marketCap: Float!
    sharesOutstanding: Float!
    shareholdersEquity: Float!
    totalDebt: Float!
    treasury: [TreasuryHolding!]!
    marketData: MarketData
    capitalStructure: CapitalStructure
    executiveCompensation: [ExecutiveCompensation!]!
    businessModel: BusinessModel!
    governance: Governance!
    lastUpdated: DateTime!
  }

  type CapitalStructure {
    sharesBasic: Float!
    sharesDilutedCurrent: Float!
    sharesDilutedAssumed: Float!
    sharesFloat: Float!
    sharesInsiderOwned: Float!
    sharesInstitutionalOwned: Float!
    convertibleDebt: [ConvertibleDebt!]!
    warrants: [Warrant!]!
  }

  type ConvertibleDebt {
    id: ID!
    issueDate: DateTime!
    maturityDate: DateTime!
    principal: Float!
    interestRate: Float!
    conversionPrice: Float!
    conversionRatio: Float!
    currentValue: Float!
    isOutstanding: Boolean!
  }

  type Warrant {
    id: ID!
    issueDate: DateTime!
    expirationDate: DateTime!
    strikePrice: Float!
    sharesPerWarrant: Float!
    totalWarrants: Float!
    isOutstanding: Boolean!
  }

  type ExecutiveCompensation {
    name: String!
    title: String!
    cashCompensation: Float!
    equityCompensation: Float!
    cryptoCompensation: Float
    totalCompensation: Float!
    year: Int!
  }

  type BusinessModel {
    revenueStreams: [String!]!
    operatingRevenue: Float!
    operatingExpenses: Float!
    cashBurnRate: Float!
    isTreasuryFocused: Boolean!
    legacyBusinessValue: Float!
  }

  type Governance {
    boardSize: Int!
    independentDirectors: Int!
    ceoFounder: Boolean!
    votingRights: String!
    auditFirm: String!
  }

  # Treasury types
  type TreasuryHolding {
    id: ID!
    company: Company!
    crypto: CryptoType!
    amount: Float!
    averageCostBasis: Float!
    totalCost: Float!
    currentPrice: Float!
    currentValue: Float!
    unrealizedGain: Float!
    unrealizedGainPercent: Float!
    transactions: [TreasuryTransaction!]!
    stakingYield: Float
    stakedAmount: Float
  }

  type TreasuryTransaction {
    id: ID!
    date: DateTime!
    amount: Float!
    pricePerUnit: Float!
    totalCost: Float!
    type: TransactionType!
    fundingMethod: FundingMethod
    notes: String
  }

  type TreasurySummary {
    totalValue: Float!
    totalCost: Float!
    totalUnrealizedGain: Float!
    totalUnrealizedGainPercent: Float!
    byCompany: [CompanyTreasurySum!]!
    byCrypto: [CryptoTreasurySum!]!
    topHoldings: [TopHolding!]!
    lastUpdated: DateTime!
  }

  # Market data types
  type MarketData {
    ticker: String!
    price: Float!
    change24h: Float!
    change24hPercent: Float!
    volume24h: Float!
    high24h: Float!
    low24h: Float!
    timestamp: DateTime!
  }

  type CryptoPrice {
    symbol: CryptoType!
    price: Float!
    change24h: Float!
    change24hPercent: Float!
    marketCap: Float!
    volume24h: Float!
    timestamp: DateTime!
  }

  type MarketFeed {
    stocks: [MarketData!]!
    cryptos: [CryptoPrice!]!
    topMovers: TopMovers!
    summary: MarketSummary!
    timestamp: DateTime!
  }

  type HistoricalData {
    symbol: String!
    type: AssetType!
    data: [HistoricalPoint!]!
  }

  # Analytics types
  type ComprehensiveAnalytics {
    ticker: String!
    company: CompanyInfo!
    currentMetrics: CurrentMetrics!
    historical: [HistoricalPoint!]!
    peerComparison: [PeerCompany!]!
    projections: Projections!
    recommendations: [Recommendation!]!
  }

  type CurrentMetrics {
    financialHealth: FinancialHealth!
    risk: RiskMetrics!
    yield: YieldMetrics!
    nav: NAVMetrics!
    performance: PerformanceMetrics!
  }

  # Enums
  enum CryptoType {
    BTC
    ETH
    SOL
  }

  enum TransactionType {
    PURCHASE
    SALE
    STAKE
    UNSTAKE
  }

  enum FundingMethod {
    EQUITY
    CONVERTIBLE_DEBT
    CREDIT_FACILITY
    PIPE
    AT_THE_MARKET
  }

  enum CompensationType {
    CASH
    EQUITY
    OPTIONS
    CRYPTO
    PERFORMANCE_UNITS
  }

  enum AlertSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum Interval {
    ONE_MIN
    FIVE_MIN
    FIFTEEN_MIN
    ONE_HOUR
    ONE_DAY
  }

  enum AssetType {
    STOCK
    CRYPTO
  }

  enum RankingMetric {
    TREASURY_VALUE
    NAV_PER_SHARE
    PREMIUM_TO_NAV
    MARKET_CAP
    DEBT_RATIO
    CRYPTO_YIELD
  }

  # Input types
  input CompanyFilter {
    sector: String
    minMarketCap: Float
    maxMarketCap: Float
    hasTreasury: Boolean
    search: String
  }

  input CompanySort {
    field: CompanySortField!
    order: SortOrder!
  }

  input TreasuryFilter {
    ticker: String
    crypto: CryptoType
    minHolding: Float
  }

  input TreasurySort {
    field: TreasurySortField!
    order: SortOrder!
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  input CreateCompanyInput {
    ticker: String!
    name: String!
    description: String
    sector: String!
    marketCap: Float!
    sharesOutstanding: Float!
    shareholdersEquity: Float!
    totalDebt: Float!
  }

  input UpdateCompanyInput {
    name: String
    description: String
    sector: String
    marketCap: Float
    sharesOutstanding: Float
    shareholdersEquity: Float
    totalDebt: Float
  }

  input TransactionInput {
    date: DateTime!
    amount: Float!
    pricePerUnit: Float!
    totalCost: Float!
    type: TransactionType!
    fundingMethod: FundingMethod
    notes: String
  }

  # Sort enums
  enum CompanySortField {
    TICKER
    NAME
    MARKET_CAP
    TREASURY_VALUE
    LAST_UPDATED
  }

  enum TreasurySortField {
    TICKER
    CRYPTO
    AMOUNT
    VALUE
    UNREALIZED_GAIN
  }

  enum SortOrder {
    ASC
    DESC
  }

  # Connection types for pagination
  type CompanyConnection {
    edges: [CompanyEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type CompanyEdge {
    node: Company!
    cursor: String!
  }

  type TreasuryConnection {
    edges: [TreasuryEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TreasuryEdge {
    node: TreasuryHolding!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Other supporting types
  type DeleteResult {
    success: Boolean!
    message: String!
  }

  type PriceUpdate {
    symbol: String!
    type: AssetType!
    price: Float!
    change: Float!
    changePercent: Float!
    timestamp: DateTime!
  }

  type Alert {
    id: ID!
    type: String!
    severity: AlertSeverity!
    message: String!
    ticker: String
    timestamp: DateTime!
  }

  type TopMovers {
    gainers: [Mover!]!
    losers: [Mover!]!
  }

  type Mover {
    ticker: String!
    name: String!
    price: Float!
    change: Float!
    changePercent: Float!
  }

  type MarketSummary {
    totalMarketCap: Float!
    totalTreasuryValue: Float!
    companiesTracked: Int!
    companiesUp: Int!
    companiesDown: Int!
  }

  type CompanyTreasurySum {
    ticker: String!
    name: String!
    totalValue: Float!
    totalCost: Float!
    holdings: [HoldingSummary!]!
  }

  type CryptoTreasurySum {
    crypto: CryptoType!
    totalAmount: Float!
    totalValue: Float!
    totalCost: Float!
    avgPrice: Float!
    holders: [HolderSummary!]!
  }

  type HoldingSummary {
    crypto: CryptoType!
    amount: Float!
    value: Float!
  }

  type HolderSummary {
    ticker: String!
    amount: Float!
    value: Float!
  }

  type TopHolding {
    ticker: String!
    name: String!
    crypto: CryptoType!
    amount: Float!
    value: Float!
    percentOfMarketCap: Float!
  }

  type HistoricalPoint {
    date: DateTime!
    value: Float!
    price: Float
    volume: Float
  }

  type CompanyInfo {
    name: String!
    sector: String!
    marketCap: Float!
    lastUpdated: DateTime!
  }

  type PeerCompany {
    ticker: String!
    name: String!
    marketCap: Float!
    treasuryValue: Float!
  }

  type Projections {
    oneMonth: Float!
    threeMonths: Float!
    sixMonths: Float!
    oneYear: Float!
  }

  type Recommendation {
    type: String!
    message: String!
    action: String!
  }

  type FinancialHealth {
    score: Float!
    liquidityRatio: Float!
    debtToEquity: Float!
    burnRate: Float!
  }

  type RiskMetrics {
    overallRisk: String!
    concentrationRisk: Float!
    liquidityRisk: String!
    operationalRisk: String!
  }

  type YieldMetrics {
    totalYield: Float!
    btcYield: Float
    ethYield: Float
    solYield: Float
  }

  type NAVMetrics {
    navPerShare: Float!
    premiumToNav: Float!
    premiumToNavPercent: Float!
  }

  type PerformanceMetrics {
    returnOnTreasury: Float!
    treasuryGrowthRate: Float!
    operationalEfficiency: Float!
  }

  type ComparativeAnalytics {
    companies: [CompanyMetrics!]!
    comparison: ComparisonResult!
    correlationMatrix: JSON!
    bestPerformers: BestPerformers!
  }

  type CompanyMetrics {
    ticker: String!
    name: String!
    sector: String!
    marketCap: Float!
    stockPrice: Float!
    metrics: JSON!
  }

  type ComparisonResult {
    rankings: JSON!
    averages: JSON!
    correlations: JSON!
  }

  type BestPerformers {
    byTreasuryValue: String!
    byNavDiscount: String!
    byYield: String!
    byRisk: String!
  }

  type ScenarioAnalysis {
    ticker: String!
    currentPrices: JSON!
    scenarios: [Scenario!]!
    stressTests: JSON!
    recommendations: JSON!
  }

  type Scenario {
    name: String!
    assumptions: JSON!
    results: JSON!
  }

  type Rankings {
    metric: String!
    sector: String
    totalCompanies: Int!
    rankings: [RankedCompany!]!
    statistics: JSON!
  }

  type RankedCompany {
    rank: Int!
    percentile: Float!
    ticker: String!
    name: String!
    sector: String!
    value: Float!
  }
`;