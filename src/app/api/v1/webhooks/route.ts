import { NextRequest } from 'next/server';
import { createWebhook, listWebhooks } from '@/api/webhooks/handler';

export async function GET(req: NextRequest) {
  return listWebhooks(req);
}

export async function POST(req: NextRequest) {
  return createWebhook(req);
}