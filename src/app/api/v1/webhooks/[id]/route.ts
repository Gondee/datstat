import { NextRequest } from 'next/server';
import { updateWebhook, deleteWebhook, testWebhook } from '@/api/webhooks/handler';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return updateWebhook(req, params);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return deleteWebhook(req, params);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  // POST to test the webhook
  return testWebhook(req, params);
}