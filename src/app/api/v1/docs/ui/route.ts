import { getSwaggerUI } from '@/api/docs/route';

export async function GET(req: Request) {
  return getSwaggerUI(req as any);
}