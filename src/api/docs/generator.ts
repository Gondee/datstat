import { v1Routes } from '../v1/routes';
import { ApiRoute } from '../gateway/router';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  security: Array<Record<string, any[]>>;
}

export function generateOpenAPISpec(): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: 'Treasury Analytics Platform API',
      description: `
        Comprehensive API for accessing corporate treasury data, market analytics, and real-time insights.
        
        ## Features
        - Company data and treasury holdings
        - Real-time market data for stocks and cryptocurrencies
        - Advanced analytics and risk metrics
        - Historical data and projections
        - Webhook integrations
        - Data export capabilities
        
        ## Authentication
        The API supports two authentication methods:
        1. **Bearer Token (JWT)**: For user authentication
        2. **API Key**: For programmatic access
        
        ## Rate Limiting
        - Free tier: 60 requests per minute
        - Basic tier: 300 requests per minute
        - Pro tier: 1000 requests per minute
        - Enterprise tier: 5000 requests per minute
      `,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api@treasuryanalytics.com',
        url: 'https://docs.treasuryanalytics.com',
      },
    },
    servers: [
      {
        url: 'https://api.treasuryanalytics.com/v1',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.treasuryanalytics.com/v1',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
    ],
    paths: generatePaths(v1Routes),
    components: {
      schemas: generateSchemas(),
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key obtained from user dashboard',
        },
      },
    },
    security: [
      { bearerAuth: [] },
      { apiKey: [] },
    ],
  };

  return spec;
}

function generatePaths(routes: ApiRoute[]): Record<string, any> {
  const paths: Record<string, any> = {};

  routes.forEach(route => {
    const path = route.path.replace('/api/v1', '');
    if (!paths[path]) {
      paths[path] = {};
    }

    const method = route.method.toLowerCase();
    paths[path][method] = generateOperation(route);
  });

  return paths;
}

function generateOperation(route: ApiRoute): any {
  const operation: any = {
    summary: generateSummary(route.path, route.method),
    description: generateDescription(route.path, route.method),
    tags: [getTag(route.path)],
    operationId: generateOperationId(route.path, route.method),
  };

  // Add parameters
  const parameters = generateParameters(route.path);
  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  // Add request body for POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
    operation.requestBody = generateRequestBody(route.path, route.method);
  }

  // Add responses
  operation.responses = generateResponses(route.path, route.method);

  // Add security requirements
  if (route.auth?.required !== false) {
    operation.security = [
      { bearerAuth: route.auth?.scopes || [] },
      { apiKey: route.auth?.scopes || [] },
    ];
  } else {
    operation.security = [];
  }

  return operation;
}

function generateSummary(path: string, method: string): string {
  const summaries: Record<string, string> = {
    'GET:/companies': 'List all companies',
    'GET:/companies/:ticker': 'Get company details',
    'POST:/companies': 'Create a new company',
    'PUT:/companies/:ticker': 'Update company information',
    'DELETE:/companies/:ticker': 'Delete a company',
    'GET:/treasury': 'List treasury holdings',
    'GET:/treasury/summary': 'Get treasury summary statistics',
    'GET:/treasury/:ticker/:crypto': 'Get specific treasury holding',
    'POST:/treasury/:ticker/:crypto/transactions': 'Add treasury transaction',
    'GET:/market/stocks': 'Get stock prices',
    'GET:/market/crypto': 'Get cryptocurrency prices',
    'GET:/market/historical/:symbol': 'Get historical market data',
    'GET:/market/feed': 'Get real-time market feed',
    'GET:/market/alerts': 'Get market alerts',
    'GET:/analytics/comprehensive/:ticker': 'Get comprehensive company analytics',
    'GET:/analytics/comparison': 'Compare multiple companies',
    'GET:/analytics/scenarios': 'Run scenario analysis',
    'GET:/analytics/rankings': 'Get company rankings',
  };

  const key = `${method}:${path.replace('/api/v1', '')}`;
  return summaries[key] || `${method} ${path}`;
}

function generateDescription(path: string, method: string): string {
  // Add detailed descriptions for each endpoint
  return `Detailed description for ${method} ${path}`;
}

function getTag(path: string): string {
  if (path.includes('/companies')) return 'Companies';
  if (path.includes('/treasury')) return 'Treasury';
  if (path.includes('/market')) return 'Market Data';
  if (path.includes('/analytics')) return 'Analytics';
  if (path.includes('/auth')) return 'Authentication';
  if (path.includes('/webhooks')) return 'Webhooks';
  if (path.includes('/export')) return 'Data Export';
  return 'General';
}

function generateOperationId(path: string, method: string): string {
  const parts = path.split('/').filter(p => p && !p.startsWith(':'));
  const action = method.toLowerCase();
  return `${action}${parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
}

function generateParameters(path: string): any[] {
  const parameters: any[] = [];

  // Extract path parameters
  const pathParams = path.match(/:(\w+)/g);
  if (pathParams) {
    pathParams.forEach(param => {
      const name = param.substring(1);
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
        description: `${name} parameter`,
      });
    });
  }

  // Add common query parameters based on path
  if (path.includes('/companies') && !path.includes(':ticker')) {
    parameters.push(
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: 'Page number',
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20, maximum: 100 },
        description: 'Items per page',
      },
      {
        name: 'sort',
        in: 'query',
        schema: { type: 'string' },
        description: 'Sort field',
      },
      {
        name: 'order',
        in: 'query',
        schema: { type: 'string', enum: ['asc', 'desc'] },
        description: 'Sort order',
      },
      {
        name: 'sector',
        in: 'query',
        schema: { type: 'string' },
        description: 'Filter by sector',
      },
      {
        name: 'search',
        in: 'query',
        schema: { type: 'string' },
        description: 'Search term',
      }
    );
  }

  return parameters;
}

function generateRequestBody(path: string, method: string): any {
  const bodies: Record<string, any> = {
    'POST:/companies': {
      description: 'Company data',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateCompanyInput',
          },
        },
      },
    },
    'PUT:/companies/:ticker': {
      description: 'Company update data',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/UpdateCompanyInput',
          },
        },
      },
    },
    'POST:/treasury/:ticker/:crypto/transactions': {
      description: 'Transaction data',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TransactionInput',
          },
        },
      },
    },
  };

  const key = `${method}:${path.replace('/api/v1', '')}`;
  return bodies[key] || {
    description: 'Request body',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  };
}

function generateResponses(path: string, method: string): any {
  const successResponse = {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ApiResponse',
        },
      },
    },
  };

  return {
    '200': successResponse,
    '201': method === 'POST' ? successResponse : undefined,
    '400': {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
    '404': {
      description: 'Not found',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
    '429': {
      description: 'Rate limit exceeded',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
    '500': {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
  };
}

function generateSchemas(): Record<string, any> {
  return {
    ApiResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        meta: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
            rateLimit: {
              type: 'object',
              properties: {
                limit: { type: 'integer' },
                remaining: { type: 'integer' },
                reset: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', default: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    Company: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        sector: { type: 'string' },
        marketCap: { type: 'number' },
        sharesOutstanding: { type: 'number' },
        shareholdersEquity: { type: 'number' },
        totalDebt: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
    TreasuryHolding: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        crypto: { type: 'string', enum: ['BTC', 'ETH', 'SOL'] },
        amount: { type: 'number' },
        averageCostBasis: { type: 'number' },
        totalCost: { type: 'number' },
        currentValue: { type: 'number' },
        unrealizedGain: { type: 'number' },
        unrealizedGainPercent: { type: 'number' },
      },
    },
    CreateCompanyInput: {
      type: 'object',
      required: ['ticker', 'name', 'sector', 'marketCap', 'sharesOutstanding'],
      properties: {
        ticker: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        sector: { type: 'string' },
        marketCap: { type: 'number' },
        sharesOutstanding: { type: 'number' },
        shareholdersEquity: { type: 'number' },
        totalDebt: { type: 'number' },
      },
    },
    UpdateCompanyInput: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        sector: { type: 'string' },
        marketCap: { type: 'number' },
        sharesOutstanding: { type: 'number' },
        shareholdersEquity: { type: 'number' },
        totalDebt: { type: 'number' },
      },
    },
    TransactionInput: {
      type: 'object',
      required: ['date', 'amount', 'pricePerUnit', 'totalCost', 'type'],
      properties: {
        date: { type: 'string', format: 'date-time' },
        amount: { type: 'number' },
        pricePerUnit: { type: 'number' },
        totalCost: { type: 'number' },
        type: { type: 'string', enum: ['purchase', 'sale', 'stake', 'unstake'] },
        fundingMethod: {
          type: 'string',
          enum: ['equity', 'convertible_debt', 'credit_facility', 'pipe', 'at_the_market'],
        },
        notes: { type: 'string' },
      },
    },
  };
}