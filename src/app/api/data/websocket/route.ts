import { NextRequest, NextResponse } from 'next/server';
import WebSocketDataServer from '@/services/external/websocket/server';
import { logger } from '@/services/external/utils/logger';

// Force Node.js runtime for WebSocket operations
export const runtime = 'nodejs';

// Global WebSocket server instance
let wsServer: WebSocketDataServer | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        if (!wsServer) {
          return NextResponse.json({
            running: false,
            message: 'WebSocket server not started',
            timestamp: new Date().toISOString(),
          });
        }

        const stats = wsServer.getConnectionStats();
        return NextResponse.json({
          running: stats.isRunning,
          stats,
          timestamp: new Date().toISOString(),
        });

      case 'start':
        if (wsServer && wsServer.getConnectionStats().isRunning) {
          return NextResponse.json({
            success: false,
            message: 'WebSocket server already running',
            timestamp: new Date().toISOString(),
          });
        }

        const port = parseInt(searchParams.get('port') || '8080');
        wsServer = new WebSocketDataServer(port);
        
        try {
          await wsServer.start();
          logger.info('API', 'WebSocket server started via API', { port });
          
          return NextResponse.json({
            success: true,
            message: `WebSocket server started on port ${port}`,
            port,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Failed to start WebSocket server: ${(error as Error).message}`,
            timestamp: new Date().toISOString(),
          }, { status: 500 });
        }

      case 'stop':
        if (!wsServer) {
          return NextResponse.json({
            success: false,
            message: 'WebSocket server not running',
            timestamp: new Date().toISOString(),
          });
        }

        try {
          await wsServer.stop();
          wsServer = null;
          logger.info('API', 'WebSocket server stopped via API');
          
          return NextResponse.json({
            success: true,
            message: 'WebSocket server stopped',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: `Failed to stop WebSocket server: ${(error as Error).message}`,
            timestamp: new Date().toISOString(),
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: status, start, stop',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('API', 'WebSocket management failed', error as Error);
    return NextResponse.json({
      success: false,
      error: 'WebSocket management failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port = 8080 } = body;

    logger.info('API', 'WebSocket action request', { action, port });

    switch (action) {
      case 'start':
        if (wsServer && wsServer.getConnectionStats().isRunning) {
          return NextResponse.json({
            success: false,
            message: 'WebSocket server already running',
            timestamp: new Date().toISOString(),
          });
        }

        wsServer = new WebSocketDataServer(port);
        await wsServer.start();
        
        return NextResponse.json({
          success: true,
          message: `WebSocket server started on port ${port}`,
          port,
          timestamp: new Date().toISOString(),
        });

      case 'stop':
        if (!wsServer) {
          return NextResponse.json({
            success: false,
            message: 'WebSocket server not running',
            timestamp: new Date().toISOString(),
          });
        }

        await wsServer.stop();
        wsServer = null;
        
        return NextResponse.json({
          success: true,
          message: 'WebSocket server stopped',
          timestamp: new Date().toISOString(),
        });

      case 'restart':
        if (wsServer) {
          await wsServer.stop();
        }
        
        wsServer = new WebSocketDataServer(port);
        await wsServer.start();
        
        return NextResponse.json({
          success: true,
          message: `WebSocket server restarted on port ${port}`,
          port,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: start, stop, restart',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('API', 'WebSocket action failed', error as Error);
    return NextResponse.json({
      success: false,
      error: 'WebSocket action failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Cleanup on process exit - only in Node.js runtime
if (typeof process !== 'undefined' && process.on) {
  process.on('SIGINT', async () => {
    if (wsServer) {
      console.log('Shutting down WebSocket server...');
      await wsServer.stop();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (wsServer) {
      console.log('Shutting down WebSocket server...');
      await wsServer.stop();
    }
    process.exit(0);
  });
}