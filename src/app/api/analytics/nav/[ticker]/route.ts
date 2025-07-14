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
    const includeProjections = searchParams.get('projections') === 'true';
    const timeRange = searchParams.get('timeRange') || '1Y';
    
    // Get real-time NAV
    const navData = await orchestrator.getRealTimeNAV(ticker.toUpperCase());
    
    // Get historical NAV if requested
    let historical = null;
    if (timeRange !== 'current') {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1M':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1Y':
        default:
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      // Would fetch historical NAV data here
      historical = [];
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        current: navData.current,
        projections: includeProjections ? navData.projections : undefined,
        historical,
        timestamp: navData.timestamp
      }
    });
  } catch (error) {
    console.error('Error fetching NAV data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch NAV data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}