import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { Webhook, WebhookEvent, WebhookPayload } from '../types';

// Webhook event emitter
class WebhookEmitter {
  private webhooks: Map<string, Webhook[]> = new Map();

  async loadWebhooks() {
    // TODO: Implement webhook loading when Webhook model is added to schema
    const webhooks: any[] = [];

    // Group webhooks by event
    this.webhooks.clear();
    // TODO: Process webhooks when webhook model is implemented
  }

  async emit(event: WebhookEvent, data: any) {
    const webhooks = this.webhooks.get(event) || [];
    
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      signature: '',
    };

    // Send webhooks in parallel
    await Promise.all(
      webhooks.map(webhook => this.sendWebhook(webhook, payload))
    );
  }

  private async sendWebhook(webhook: Webhook, payload: WebhookPayload) {
    // Generate signature
    const signature = this.generateSignature(webhook.secret, payload);
    payload.signature = signature;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // TODO: Update last triggered when webhook model is implemented
      // await // TODO: prisma.webhook.update({...});
    } catch (error) {
      console.error(`Webhook failed for ${webhook.url}:`, error);
      
      // TODO: Update failure count when webhook model is implemented
      // await // TODO: prisma.webhook.update({...});
    }
  }

  private generateSignature(secret: string, payload: WebhookPayload): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify({
      event: payload.event,
      data: payload.data,
      timestamp: payload.timestamp,
    }));
    return hmac.digest('hex');
  }
}

export const webhookEmitter = new WebhookEmitter();

// Initialize webhooks on startup
webhookEmitter.loadWebhooks();

// Webhook management endpoints
export async function createWebhook(req: NextRequest): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  const body = await req.json();
  
  // Validate webhook URL
  try {
    new URL(body.url);
  } catch {
    return ApiResponseBuilder.badRequest('Invalid webhook URL');
  }

  // Validate events
  const validEvents: WebhookEvent[] = [
    'company.created',
    'company.updated',
    'company.deleted',
    'treasury.updated',
    'market.alert',
    'analytics.threshold',
    'system.error',
  ];

  const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e as WebhookEvent));
  if (invalidEvents.length > 0) {
    return ApiResponseBuilder.badRequest(`Invalid events: ${invalidEvents.join(', ')}`);
  }

  try {
    // TODO: Implement webhook creation when Webhook model is added to schema
    const webhook = { 
      id: 'mock-webhook-id', 
      url: body.url, 
      events: body.events, 
      secret: 'mock-secret',
      active: true,
      createdAt: new Date()
    };

    // Reload webhooks
    await webhookEmitter.loadWebhooks();

    return ApiResponseBuilder.success({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      active: webhook.active,
      createdAt: webhook.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return ApiResponseBuilder.internalError('Failed to create webhook');
  }
}

export async function listWebhooks(req: NextRequest): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  try {
    // TODO: Implement webhook listing when Webhook model is added to schema
    const webhooks: any[] = [];

    return ApiResponseBuilder.success(webhooks);
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return ApiResponseBuilder.internalError('Failed to list webhooks');
  }
}

export async function updateWebhook(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  const body = await req.json();

  try {
    // TODO: Implement webhook update when Webhook model is added to schema
    const webhook = null;

    // TODO: Check if webhook exists in database
    // if (!webhook) {
    //   return ApiResponseBuilder.notFound('Webhook');
    // }

    const updated = { id: params.id, url: body.url, events: body.events, active: body.active };

    // Reload webhooks
    await webhookEmitter.loadWebhooks();

    return ApiResponseBuilder.success({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      active: updated.active,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      failureCount: 0,
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return ApiResponseBuilder.internalError('Failed to update webhook');
  }
}

export async function deleteWebhook(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  try {
    // TODO: Implement webhook deletion when Webhook model is added to schema
    const webhook = null;

    // TODO: Check if webhook exists in database
    // if (!webhook) {
    //   return ApiResponseBuilder.notFound('Webhook');
    // }

    // TODO: Delete webhook from database

    // Reload webhooks
    await webhookEmitter.loadWebhooks();

    return ApiResponseBuilder.success({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return ApiResponseBuilder.internalError('Failed to delete webhook');
  }
}

// Test webhook endpoint
export async function testWebhook(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  try {
    // TODO: Implement webhook testing when Webhook model is added to schema
    const webhook = { 
      id: params.id, 
      url: 'https://example.com/webhook', 
      secret: 'mock-secret',
      events: ['system.test']
    };

    // TODO: Check if webhook exists in database
    // if (!webhook) {
    //   return ApiResponseBuilder.notFound('Webhook');
    // }

    // Send test payload
    const testPayload: WebhookPayload = {
      event: 'system.test' as any,
      data: {
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      signature: '',
    };

    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(JSON.stringify({
        event: testPayload.event,
        data: testPayload.data,
        timestamp: testPayload.timestamp,
      }))
      .digest('hex');

    testPayload.signature = signature;

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'system.test',
        'X-Webhook-Timestamp': testPayload.timestamp,
      },
      body: JSON.stringify(testPayload),
    });

    return ApiResponseBuilder.success({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error: any) {
    return ApiResponseBuilder.badRequest('Webhook test failed', {
      error: error.message,
    });
  }
}