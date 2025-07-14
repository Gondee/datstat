import { getExamples } from '@/api/docs/route';

export async function GET(req: Request) {
  return getExamples(req as any);
}