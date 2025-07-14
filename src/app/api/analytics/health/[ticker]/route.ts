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
    const includeESG = searchParams.get('esg') === 'true';
    const format = searchParams.get('format') || 'detailed';
    
    // Get comprehensive analytics to extract health score
    const analytics = await orchestrator.getComprehensiveAnalytics(
      ticker.toUpperCase(),
      true
    );
    
    const healthData = analytics.financialHealth;
    
    // Format response based on requested format
    let response;
    
    switch (format) {
      case 'summary':
        response = {
          ticker: ticker.toUpperCase(),
          score: healthData.overallScore,
          grade: healthData.grade,
          outlook: healthData.outlook,
          keyStrengths: healthData.strengths.slice(0, 3),
          keyWeaknesses: healthData.weaknesses.slice(0, 3),
          topRecommendation: healthData.recommendations[0] || 'Maintain current strategy'
        };
        break;
        
      case 'scorecard':
        response = {
          ticker: ticker.toUpperCase(),
          scores: {
            overall: { score: healthData.overallScore, grade: healthData.grade },
            liquidity: { 
              score: healthData.components.liquidity.score, 
              rating: healthData.components.liquidity.liquidityRating 
            },
            solvency: { 
              score: healthData.components.solvency.score, 
              rating: healthData.components.solvency.solvencyRating 
            },
            efficiency: { 
              score: healthData.components.efficiency.score, 
              rating: healthData.components.efficiency.efficiencyRating 
            },
            growth: { 
              score: healthData.components.growth.score, 
              rating: healthData.components.growth.growthRating 
            },
            treasury: { 
              score: healthData.components.treasury.score, 
              rating: healthData.components.treasury.treasuryRating 
            }
          },
          esg: includeESG ? healthData.esgScore : undefined
        };
        break;
        
      case 'detailed':
      default:
        response = {
          ticker: ticker.toUpperCase(),
          financialHealth: healthData,
          metrics: {
            nav: analytics.nav.assumedDilutedNAVPerShare,
            premiumDiscount: analytics.nav.premiumDiscount.toAssumedDilutedNAVPercent,
            cryptoYield: analytics.cryptoYield.totalCryptoYield.yieldPercent,
            dilutionRate: analytics.dilution.currentDilution.dilutionPercent,
            riskScore: analytics.risk.riskScore.overallScore
          },
          timestamp: analytics.timestamp
        };
    }
    
    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching financial health:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch financial health data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for batch health assessment
export async function POST(request: NextRequest) {
  try {
    const orchestrator = new AnalyticsOrchestrator();
    const body = await request.json();
    
    const { tickers, compareWithPeers = false } = body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tickers array is required' },
        { status: 400 }
      );
    }
    
    // Get health scores for all requested companies
    const healthScores = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const analytics = await orchestrator.getComprehensiveAnalytics(
            ticker.toUpperCase(),
            false // Don't need historical for batch
          );
          
          return {
            ticker: ticker.toUpperCase(),
            score: analytics.financialHealth.overallScore,
            grade: analytics.financialHealth.grade,
            outlook: analytics.financialHealth.outlook,
            components: {
              liquidity: analytics.financialHealth.components.liquidity.score,
              solvency: analytics.financialHealth.components.solvency.score,
              efficiency: analytics.financialHealth.components.efficiency.score,
              growth: analytics.financialHealth.components.growth.score,
              treasury: analytics.financialHealth.components.treasury.score
            }
          };
        } catch (error) {
          return {
            ticker: ticker.toUpperCase(),
            error: 'Failed to calculate health score'
          };
        }
      })
    );
    
    // Calculate peer statistics if requested
    let peerStats = null;
    if (compareWithPeers) {
      const validScores = healthScores.filter(s => !s.error);
      const scores = validScores.map(s => s.score);
      
      peerStats = {
        averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
        medianScore: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
        bestPerformer: validScores.reduce((best, current) => 
          current.score > best.score ? current : best
        ).ticker,
        worstPerformer: validScores.reduce((worst, current) => 
          current.score < worst.score ? current : worst
        ).ticker
      };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        companies: healthScores,
        peerStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error performing batch health assessment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform batch health assessment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}