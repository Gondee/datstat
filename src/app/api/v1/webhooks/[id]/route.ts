import { NextRequest } from 'next/server';
import { updateWebhook, deleteWebhook, testWebhook } from '@/api/webhooks/handler';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return updateWebhook(req, resolvedParams);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return deleteWebhook(req, resolvedParams);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  // POST to test the webhook
  const resolvedParams = await params;
  return testWebhook(req, resolvedParams);
}