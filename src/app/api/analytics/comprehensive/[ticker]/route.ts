import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analytics/analyticsService';
import { createOptimizedAPIHandler } from '@/lib/performance/api-optimization';

// Optimized GET handler with caching and compression
export const GET = createOptimizedAPIHandler(
  async (request: NextRequest, { params }: { params: Promise<{ ticker: string }> }) => {
    const { ticker } = await params;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeHistorical = searchParams.get('historical') !== 'false';
    const sections = searchParams.get('sections')?.split(',') || ['all'];
    
    // Get comprehensive analytics from service
    const analytics = await analyticsService.getComprehensiveAnalytics(ticker.toUpperCase());
    
    // Build response based on requested sections
    const response: any = {
      ticker: ticker.toUpperCase(),
      timestamp: analytics.timestamp
    };
    
    const includeSections = new Set(sections);
    const includeAll = includeSections.has('all');
    
    // mNAV Analysis
    if (includeAll || includeSections.has('nav')) {
      response.nav = {
        current: analytics.mNavAnalysis.current,
        projections: analytics.mNavAnalysis.projections,
        breakdown: analytics.mNavAnalysis.breakdown
      };
    }
    
    // Crypto Yield
    if (includeAll || includeSections.has('yield')) {
      response.cryptoYield = {
        current: analytics.yieldTracking.currentYield,
        byHolding: analytics.yieldTracking.yieldByHolding,
        projections: analytics.yieldTracking.projectedYield,
        optimization: analytics.yieldTracking.optimizationOpportunities
      };
    }
    
    // Dilution Analysis
    if (includeAll || includeSections.has('dilution')) {
      response.dilution = analytics.dilutionAnalysis;
    }
    
    // Risk Assessment
    if (includeAll || includeSections.has('risk')) {
      response.risk = analytics.riskAnalysis;
    }
    
    // Financial Health
    if (includeAll || includeSections.has('health')) {
      response.financialHealth = analytics.financialHealth;
    }
    
    // Summary
    response.summary = analytics.summary;
    
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
        result = await analyticsService.getMNavAnalytics(ticker.toUpperCase());
        break;
        
      case 'yield-breakdown':
        // Detailed yield analysis
        result = await analyticsService.getYieldAnalytics(ticker.toUpperCase());
        break;
        
      case 'risk-assessment':
        // Risk analysis
        result = await analyticsService.getRiskAnalytics(ticker.toUpperCase());
        break;
        
      case 'peer-relative':
        // Relative analysis vs specific peers
        const peers = compareWith || [];
        const allTickers = [ticker.toUpperCase(), ...peers.map((p: string) => p.toUpperCase())];
        
        result = await analyticsService.getComparativeAnalytics(allTickers);
        break;
        
      default:
        // Default comprehensive analysis
        result = await analyticsService.getComprehensiveAnalytics(ticker.toUpperCase());
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