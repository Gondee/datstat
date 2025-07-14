import { NextRequest } from 'next/server';
import { exportTreasuryHoldings } from '@/api/integrations/export';

export async function GET(req: NextRequest) {
  return exportTreasuryHoldings(req);
}