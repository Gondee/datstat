/**
 * Analytics Engine Exports
 * Central export point for all analytics engines
 */

export { default as AnalyticsOrchestrator } from './analyticsOrchestrator';
export { default as EnhancedNAVEngine } from './mNavEngine';
export { default as CryptoYieldEngine } from './cryptoYieldEngine';
export { default as DilutionEngine } from './dilutionEngine';
export { default as RiskEngine } from './riskEngine';
export { default as ComparativeEngine } from './comparativeEngine';
export { default as FinancialHealthEngine } from './financialHealthEngine';

// Export types
export type {
  ComprehensiveAnalytics,
  ComparativeAnalyticsResult,
  ScenarioAnalysisResult
} from './analyticsOrchestrator';

export type {
  NAVComponents,
  NAVCalculation,
  NAVProjection
} from './mNavEngine';

export type {
  CryptoYieldCalculation,
  YieldMetrics,
  AccretiveDilutiveAnalysis,
  CostBasisTracking,
  YieldComparison
} from './cryptoYieldEngine';

export type {
  DilutionAnalysis,
  DilutionSnapshot,
  DilutionProjection,
  ConversionScenario,
  WarrantAnalysis,
  CompensationDilution,
  WhatIfScenario,
  DilutionWaterfall
} from './dilutionEngine';

export type {
  ComprehensiveRiskMetrics,
  MarketRiskMetrics,
  ConcentrationRiskAnalysis,
  LiquidityRiskMetrics,
  CreditRiskAssessment,
  OperationalRiskMetrics,
  CorrelationMetrics,
  ValueAtRiskAnalysis,
  StressTestResults,
  RiskScorecard
} from './riskEngine';

export type {
  ComparativeAnalysis,
  PeerGroupAnalysis,
  MetricRankings,
  CompanyRanking,
  PercentileAnalysis,
  PeerCorrelations,
  EfficiencyFrontier,
  RelativeValueAnalysis,
  PerformanceAttribution
} from './comparativeEngine';

export type {
  FinancialHealthScore,
  LiquidityHealth,
  SolvencyHealth,
  EfficiencyHealth,
  GrowthHealth,
  TreasuryHealth,
  ESGScore
} from './financialHealthEngine';

// Function exports for direct access
import FinancialHealthEngine from './financialHealthEngine';
import RiskEngine from './riskEngine';
import CryptoYieldEngine from './cryptoYieldEngine';
import EnhancedNAVEngine from './mNavEngine';
import ComparativeEngine from './comparativeEngine';

// Create singleton instances
const financialHealthEngine = new FinancialHealthEngine();
const riskEngine = new RiskEngine();
const cryptoYieldEngine = new CryptoYieldEngine();
const navEngine = new EnhancedNAVEngine();
const comparativeEngine = new ComparativeEngine();

// Export convenience functions
export const calculateFinancialHealth = financialHealthEngine.calculateFinancialHealth.bind(financialHealthEngine);
export const calculateRiskMetrics = riskEngine.calculateRiskMetrics.bind(riskEngine);
export const calculateYieldMetrics = cryptoYieldEngine.calculateCryptoYield.bind(cryptoYieldEngine);
export const calculateNAVMetrics = navEngine.calculateRealTimeNAV.bind(navEngine);
export const performComparativeAnalysis = comparativeEngine.performComparativeAnalysis.bind(comparativeEngine);