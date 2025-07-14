import { getRedoc } from '@/api/docs/route';

export async function GET(req: Request) {
  return getRedoc(req as any);
}