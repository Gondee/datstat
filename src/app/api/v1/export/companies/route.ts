import { NextRequest } from 'next/server';
import { exportCompanies } from '@/api/integrations/export';

export async function GET(req: NextRequest) {
  return exportCompanies(req);
}