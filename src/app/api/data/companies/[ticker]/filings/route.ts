import { NextRequest, NextResponse } from 'next/server';
import { secEdgarService } from '@/services/external/apis/secEdgarService';
import { logger } from '@/services/external/utils/logger';

interface RouteParams {
  params: {
    ticker: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = params;
    const { searchParams } = new URL(request.url);
    const parsed = searchParams.get('parsed');
    const accessionNumber = searchParams.get('accessionNumber');

    logger.info('API', `SEC filings request`, { ticker, parsed, accessionNumber });

    if (accessionNumber) {
      // Get specific filing document
      const result = await secEdgarService.getFilingDocument(ticker, accessionNumber);
      return NextResponse.json(result);
    }

    if (parsed === 'true') {
      // Get parsed financial data
      const result = await secEdgarService.parseLatestFinancials(ticker);
      return NextResponse.json(result);
    }

    // Get recent quarterly filings
    const result = await secEdgarService.getRecentQuarterlyFilings(ticker);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API', `SEC filings fetch failed for ${params.ticker}`, error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch SEC filings',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = params;
    const body = await request.json();
    const { filingTypes, limit } = body;

    logger.info('API', `SEC filings custom request`, { ticker, filingTypes, limit });

    // Get all company filings and filter by requested types
    const filingsResponse = await secEdgarService.getCompanyFilings(ticker);
    const filings = filingsResponse.data.filings.recent;
    
    const filteredFilings = [];
    const maxResults = limit || 20;
    
    for (let i = 0; i < filings.form.length && filteredFilings.length < maxResults; i++) {
      const form = filings.form[i];
      
      if (!filingTypes || filingTypes.includes(form)) {
        filteredFilings.push({
          accessionNumber: filings.accessionNumber[i],
          filingDate: filings.filingDate[i],
          reportDate: filings.reportDate[i],
          form: filings.form[i],
          primaryDocument: filings.primaryDocument[i],
          primaryDocDescription: filings.primaryDocDescription[i],
        });
      }
    }

    return NextResponse.json({
      data: filteredFilings,
      success: true,
      timestamp: new Date().toISOString(),
      source: 'SEC EDGAR',
    });
  } catch (error) {
    logger.error('API', `SEC filings custom fetch failed for ${params.ticker}`, error as Error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch SEC filings',
        message: (error as Error).message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}