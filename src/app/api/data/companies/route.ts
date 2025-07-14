import { NextResponse } from 'next/server';
import { companiesWithMetrics } from '@/data/mockData';

export async function GET() {
  try {
    // Return mock data for now
    // TODO: Replace with real database query when ready
    return NextResponse.json({
      success: true,
      data: companiesWithMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch companies data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}