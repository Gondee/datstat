import { NextRequest, NextResponse } from 'next/server';
import { ApiResponseBuilder } from '../utils/response';

interface SlackMessage {
  channel?: string;
  text?: string;
  blocks?: any[];
  attachments?: any[];
}

export class SlackIntegration {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error('Slack integration error:', error);
      return false;
    }
  }

  async sendAlert(
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string,
    details?: Record<string, any>
  ): Promise<boolean> {
    const colors = {
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
      success: '#4CAF50',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ];

    if (details) {
      const fields = Object.entries(details).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:* ${value}`,
      }));

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: fields.slice(0, 10).map(f => f.text).join('\n'),
        },
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Sent from Treasury Analytics Platform at ${new Date().toISOString()}_`,
      },
    });

    return this.sendMessage({
      attachments: [
        {
          color: colors[type],
          blocks,
        },
      ],
    });
  }

  async sendTreasuryUpdate(
    company: string,
    crypto: string,
    action: 'purchase' | 'sale',
    amount: number,
    value: number
  ): Promise<boolean> {
    const emoji = action === 'purchase' ? '📈' : '📉';
    const actionText = action === 'purchase' ? 'purchased' : 'sold';

    return this.sendMessage({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${company}* ${actionText} ${amount} ${crypto}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Amount:* ${amount.toLocaleString()} ${crypto}`,
            },
            {
              type: 'mrkdwn',
              text: `*Value:* $${value.toLocaleString()}`,
            },
          ],
        },
      ],
    });
  }

  async sendMarketAlert(
    ticker: string,
    metric: string,
    currentValue: number,
    threshold: number,
    direction: 'above' | 'below'
  ): Promise<boolean> {
    const emoji = direction === 'above' ? '🚨' : '⚠️';

    return this.sendMessage({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *Market Alert for ${ticker}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${metric} is now ${direction} threshold`,
          },
          fields: [
            {
              type: 'mrkdwn',
              text: `*Current:* ${currentValue}`,
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:* ${threshold}`,
            },
          ],
        },
      ],
    });
  }
}

// Slack webhook configuration endpoint
export async function configureSlackWebhook(req: NextRequest): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  const { webhookUrl } = await req.json();

  // Validate webhook URL
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    return ApiResponseBuilder.badRequest('Invalid Slack webhook URL');
  }

  try {
    // Test the webhook
    const slack = new SlackIntegration(webhookUrl);
    const success = await slack.sendMessage({
      text: 'Treasury Analytics Platform connected successfully!',
    });

    if (!success) {
      return ApiResponseBuilder.badRequest('Failed to connect to Slack');
    }

    // TODO: Save configuration to user preferences or dedicated integration table
    // For now, just validate the webhook works
    console.log('Slack integration configured for user:', user.id);

    return ApiResponseBuilder.success({
      message: 'Slack integration configured successfully',
    });
  } catch (error) {
    console.error('Error configuring Slack:', error);
    return ApiResponseBuilder.internalError('Failed to configure Slack integration');
  }
}

// Send test notification
export async function testSlackIntegration(req: NextRequest): Promise<NextResponse> {
  const user = (req as any).user;
  if (!user) {
    return ApiResponseBuilder.unauthorized();
  }

  try {
    // TODO: Load integration from user preferences or dedicated integration table
    // For now, use environment variable for webhook URL
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return ApiResponseBuilder.badRequest('Slack integration not configured');
    }

    const slack = new SlackIntegration(webhookUrl);
    const success = await slack.sendAlert(
      'info',
      'Test Notification',
      'This is a test notification from Treasury Analytics Platform',
      {
        'Timestamp': new Date().toISOString(),
        'User': user.email,
      }
    );

    return ApiResponseBuilder.success({
      success,
      message: success ? 'Test notification sent' : 'Failed to send notification',
    });
  } catch (error) {
    console.error('Error testing Slack:', error);
    return ApiResponseBuilder.internalError('Failed to test Slack integration');
  }
}

// Import Prisma client
import { prisma } from '@/lib/prisma';