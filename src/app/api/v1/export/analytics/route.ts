import { NextRequest } from 'next/server';
import { exportAnalyticsReport } from '@/api/integrations/export';

export async function GET(req: NextRequest) {
  return exportAnalyticsReport(req);
}