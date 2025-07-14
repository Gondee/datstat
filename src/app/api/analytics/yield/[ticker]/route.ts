import { NextRequest, NextResponse } from 'next/server';
import AnalyticsOrchestrator from '@/utils/analytics/analyticsOrchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    const orchestrator = new AnalyticsOrchestrator();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeFrame = searchParams.get('timeFrame') as 'quarterly' | 'yearly' || 'yearly';
    const includeComparison = searchParams.get('comparison') === 'true';
    
    // Get crypto yield analysis
    const yieldData = await orchestrator.getCryptoYieldAnalysis(
      ticker.toUpperCase(),
      timeFrame
    );
    
    // Get peer comparison if requested
    let peerComparison = null;
    if (includeComparison) {
      const comparativeData = await orchestrator.getComparativeAnalytics();
      peerComparison = yieldData.yieldComparison;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        timeFrame,
        yields: {
          btc: yieldData.btcYield,
          eth: yieldData.ethYield,
          sol: yieldData.solYield,
          total: yieldData.totalCryptoYield
        },
        accretiveDilutive: yieldData.accretiveDilutiveAnalysis,
        costBasis: yieldData.costBasisTracking,
        peerComparison,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching yield data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch yield data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}