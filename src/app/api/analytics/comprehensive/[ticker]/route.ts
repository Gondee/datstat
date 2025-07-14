import { NextRequest, NextResponse } from 'next/server';
import AnalyticsOrchestrator from '@/utils/analytics/analyticsOrchestrator';
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

// Optimized GET handler with caching and compression
export const GET = createOptimizedAPIHandler(
  async (request: NextRequest, { params }: { params: Promise<{ ticker: string }> }) => {
    const { ticker } = await params;
    const orchestrator = new AnalyticsOrchestrator();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeHistorical = searchParams.get('historical') !== 'false';
    const sections = searchParams.get('sections')?.split(',') || ['all'];
    
    // Get comprehensive analytics
    const analytics = await orchestrator.getComprehensiveAnalytics(
      ticker.toUpperCase(),
      includeHistorical
    );
    
    // Build response based on requested sections
    const response: any = {
      ticker: ticker.toUpperCase(),
      timestamp: analytics.timestamp
    };
    
    const includeSections = new Set(sections);
    const includeAll = includeSections.has('all');
    
    // NAV Analysis
    if (includeAll || includeSections.has('nav')) {
      response.nav = {
        current: {
          basicNAVPerShare: analytics.nav.basicNAVPerShare,
          dilutedNAVPerShare: analytics.nav.dilutedNAVPerShare,
          assumedDilutedNAVPerShare: analytics.nav.assumedDilutedNAVPerShare,
          premiumDiscount: analytics.nav.premiumDiscount
        },
        components: analytics.nav.components,
        shareDetails: analytics.nav.shareCountDetails
      };
    }
    
    // Crypto Yield
    if (includeAll || includeSections.has('yield')) {
      response.cryptoYield = {
        yields: {
          btc: analytics.cryptoYield.btcYield,
          eth: analytics.cryptoYield.ethYield,
          sol: analytics.cryptoYield.solYield,
          total: analytics.cryptoYield.totalCryptoYield
        },
        accretiveDilutive: analytics.cryptoYield.accretiveDilutiveAnalysis
      };
    }
    
    // Dilution Analysis
    if (includeAll || includeSections.has('dilution')) {
      response.dilution = {
        current: analytics.dilution.currentDilution,
        projections: analytics.dilution.projectedDilution,
        warrantAnalysis: analytics.dilution.warrantAnalysis,
        waterfall: analytics.dilution.dilutionWaterfall
      };
    }
    
    // Risk Assessment
    if (includeAll || includeSections.has('risk')) {
      response.risk = {
        scorecard: analytics.risk.riskScore,
        marketRisk: {
          volatility: analytics.risk.marketRisk.volatility.annualized,
          beta: analytics.risk.marketRisk.beta,
          sharpeRatio: analytics.risk.marketRisk.sharpeRatio
        },
        concentrationRisk: analytics.risk.concentrationRisk.treasuryConcentration,
        stressTest: analytics.risk.stressTest.scenarios.map(s => ({
          scenario: s.name,
          probability: s.probability,
          impact: s.overallImpact
        }))
      };
    }
    
    // Financial Health
    if (includeAll || includeSections.has('health')) {
      response.financialHealth = {
        score: analytics.financialHealth.overallScore,
        grade: analytics.financialHealth.grade,
        outlook: analytics.financialHealth.outlook,
        components: Object.entries(analytics.financialHealth.components).reduce((acc, [key, value]) => {
          acc[key] = {
            score: value.score,
            rating: value[`${key}Rating`]
          };
          return acc;
        }, {} as any),
        strengths: analytics.financialHealth.strengths,
        recommendations: analytics.financialHealth.recommendations
      };
    }
    
    // Institutional Metrics Summary
    if (includeAll || includeSections.has('institutional')) {
      response.institutionalMetrics = {
        treasuryValue: analytics.institutionalMetrics.treasuryValue,
        treasuryValuePerShare: analytics.institutionalMetrics.treasuryValuePerShare,
        navPerShare: analytics.institutionalMetrics.navPerShare,
        premiumToNav: analytics.institutionalMetrics.premiumToNavPercent,
        debtToTreasury: analytics.institutionalMetrics.debtToTreasuryRatio,
        capitalEfficiency: analytics.institutionalMetrics.capitalEfficiency,
        operationalMetrics: analytics.institutionalMetrics.operationalMetrics
      };
    }
    
    return NextResponse.json({
      success: true,
      data: response
    });
  },
  {
    cache: {
      enabled: true,
      ttl: 30000, // Cache for 30 seconds
      keyGenerator: (req, params) => `analytics:comprehensive:${params?.ticker}:${req.nextUrl.search}`
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 30
    },
    compression: true
  }
);

// POST endpoint for custom analytics requests
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const orchestrator = new AnalyticsOrchestrator();
    const body = await request.json();
    
    const {
      analysisType,
      timeFrame,
      scenarios,
      compareWith,
      customParameters
    } = body;
    
    let result: any = {};
    
    // Handle different analysis types
    switch (analysisType) {
      case 'nav-attribution':
        // NAV attribution analysis
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        result = await orchestrator.getRealTimeNAV(ticker.toUpperCase());
        break;
        
      case 'yield-breakdown':
        // Detailed yield analysis
        const yieldData = await orchestrator.getCryptoYieldAnalysis(
          ticker.toUpperCase(),
          timeFrame || 'yearly'
        );
        result = {
          yields: yieldData,
          costBasis: yieldData.costBasisTracking,
          accretionAnalysis: yieldData.accretiveDilutiveAnalysis
        };
        break;
        
      case 'scenario-stress':
        // Custom scenario analysis
        if (!scenarios || !Array.isArray(scenarios)) {
          return NextResponse.json(
            { success: false, error: 'Scenarios are required for scenario-stress analysis' },
            { status: 400 }
          );
        }
        
        result = await orchestrator.runScenarioAnalysis(
          ticker.toUpperCase(),
          scenarios
        );
        break;
        
      case 'peer-relative':
        // Relative analysis vs specific peers
        const peers = compareWith || [];
        const allTickers = [ticker.toUpperCase(), ...peers.map((p: string) => p.toUpperCase())];
        
        const comparativeData = await orchestrator.getComparativeAnalytics(allTickers);
        
        // Extract relative metrics for the target company
        const targetRankings = Object.entries(comparativeData.rankings).reduce((acc, [metric, rankings]) => {
          const targetRank = rankings.find(r => r.ticker === ticker.toUpperCase());
          if (targetRank) {
            acc[metric] = {
              rank: targetRank.rank,
              percentile: targetRank.percentile,
              value: targetRank.value
            };
          }
          return acc;
        }, {} as any);
        
        result = {
          rankings: targetRankings,
          peerComparison: comparativeData.comparative.relativeValue,
          correlations: comparativeData.comparative.correlations
        };
        break;
        
      default:
        // Default comprehensive analysis
        result = await orchestrator.getComprehensiveAnalytics(
          ticker.toUpperCase(),
          true
        );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        analysisType: analysisType || 'comprehensive',
        results: result,
        parameters: {
          timeFrame,
          scenarios,
          compareWith,
          customParameters
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error performing custom analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform custom analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}