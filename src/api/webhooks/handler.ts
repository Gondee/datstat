import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '../utils/response';
import { Webhook, WebhookEvent, WebhookPayload } from '../types';

// Webhook event emitter
class WebhookEmitter {
  private webhooks: Map<string, Webhook[]> = new Map();

  async loadWebhooks() {
    const webhooks = await prisma.webhook.findMany({
      where: { active: true },
    });

    // Group webhooks by event
    this.webhooks.clear();
    webhooks.forEach(webhook => {
      webhook.events.forEach(event => {
        if (!this.webhooks.has(event)) {
          this.webhooks.set(event, []);
        }
        this.webhooks.get(event)!.push(webhook);
      });
    });
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

      // Update last triggered
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggered: new Date(),
          failureCount: 0,
        },
      });
    } catch (error) {
      console.error(`Webhook failed for ${webhook.url}:`, error);
      
      // Update failure count
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      });

      // Disable webhook after too many failures
      if (webhook.failureCount >= 5) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { active: false },
        });
      }
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
    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        url: body.url,
        events: body.events,
        secret: crypto.randomBytes(32).toString('hex'),
        active: true,
        failureCount: 0,
      },
    });

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
    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponseBuilder.success(
      webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt.toISOString(),
        lastTriggered: w.lastTriggered?.toISOString(),
        failureCount: w.failureCount,
      }))
    );
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
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!webhook) {
      return ApiResponseBuilder.notFound('Webhook');
    }

    const updated = await prisma.webhook.update({
      where: { id: params.id },
      data: {
        url: body.url || webhook.url,
        events: body.events || webhook.events,
        active: body.active !== undefined ? body.active : webhook.active,
      },
    });

    // Reload webhooks
    await webhookEmitter.loadWebhooks();

    return ApiResponseBuilder.success({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      active: updated.active,
      createdAt: updated.createdAt.toISOString(),
      lastTriggered: updated.lastTriggered?.toISOString(),
      failureCount: updated.failureCount,
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
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!webhook) {
      return ApiResponseBuilder.notFound('Webhook');
    }

    await prisma.webhook.delete({
      where: { id: params.id },
    });

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
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!webhook) {
      return ApiResponseBuilder.notFound('Webhook');
    }

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