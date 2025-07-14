import { NextRequest } from 'next/server';
import { configureSlackWebhook, testSlackIntegration } from '@/api/integrations/slack';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'test') {
    return testSlackIntegration(req);
  }

  return configureSlackWebhook(req);
}