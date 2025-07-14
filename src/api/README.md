# Treasury Analytics Platform API

A comprehensive REST and GraphQL API for accessing corporate treasury data, market analytics, and real-time insights.

## Overview

The Treasury Analytics Platform API provides programmatic access to:
- Company financial data and treasury holdings
- Real-time cryptocurrency and stock market data
- Advanced analytics and risk metrics
- Historical data and future projections
- Webhook integrations for real-time updates
- Data export capabilities in multiple formats

## API Architecture

```
src/api/
├── gateway/          # API gateway and routing
├── middleware/       # Authentication, rate limiting, validation, logging
├── v1/              # Version 1 REST API endpoints
├── v2/              # Version 2 REST API endpoints (future)
├── graphql/         # GraphQL schema and resolvers
├── webhooks/        # Webhook management
├── integrations/    # External service integrations
├── docs/            # API documentation generation
├── utils/           # Utility functions
└── types.ts         # TypeScript type definitions
```

## Authentication

The API supports two authentication methods:

### 1. Bearer Token (JWT)
```bash
curl -X POST https://api.treasuryanalytics.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use the token in subsequent requests
curl -X GET https://api.treasuryanalytics.com/api/v1/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Key
```bash
curl -X GET https://api.treasuryanalytics.com/api/v1/companies \
  -H "X-API-Key: YOUR_API_KEY"
```

## Rate Limiting

API rate limits vary by tier:
- **Free**: 60 requests per minute
- **Basic**: 300 requests per minute
- **Pro**: 1,000 requests per minute
- **Enterprise**: 5,000 requests per minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1641234567
```

## REST API Endpoints

### Companies
- `GET /api/v1/companies` - List all companies
- `GET /api/v1/companies/:ticker` - Get company details
- `POST /api/v1/companies` - Create new company (Admin)
- `PUT /api/v1/companies/:ticker` - Update company (Admin)
- `DELETE /api/v1/companies/:ticker` - Delete company (Admin)

### Treasury Holdings
- `GET /api/v1/treasury` - List treasury holdings
- `GET /api/v1/treasury/summary` - Get summary statistics
- `GET /api/v1/treasury/:ticker/:crypto` - Get specific holding
- `POST /api/v1/treasury/:ticker/:crypto/transactions` - Add transaction (Admin)

### Market Data
- `GET /api/v1/market/stocks` - Get stock prices
- `GET /api/v1/market/crypto` - Get cryptocurrency prices
- `GET /api/v1/market/historical/:symbol` - Get historical data
- `GET /api/v1/market/feed` - Get real-time market feed
- `GET /api/v1/market/alerts` - Get market alerts

### Analytics
- `GET /api/v1/analytics/comprehensive/:ticker` - Comprehensive analytics
- `GET /api/v1/analytics/comparison` - Compare multiple companies
- `GET /api/v1/analytics/scenarios` - Scenario analysis
- `GET /api/v1/analytics/rankings` - Company rankings

### Data Export
- `GET /api/v1/export/companies` - Export company data
- `GET /api/v1/export/treasury` - Export treasury holdings
- `GET /api/v1/export/analytics` - Export analytics report

Supported formats: `json`, `csv`, `excel`, `pdf`

### Webhooks
- `GET /api/v1/webhooks` - List webhooks
- `POST /api/v1/webhooks` - Create webhook
- `PUT /api/v1/webhooks/:id` - Update webhook
- `DELETE /api/v1/webhooks/:id` - Delete webhook
- `POST /api/v1/webhooks/:id/test` - Test webhook

### Integrations
- `POST /api/v1/integrations/slack` - Configure Slack
- `POST /api/v1/integrations/slack?action=test` - Test Slack

## GraphQL API

The GraphQL endpoint is available at `/api/graphql`.

### Example Queries

```graphql
# Get company with treasury holdings
query GetCompany {
  company(ticker: "MSTR") {
    ticker
    name
    marketCap
    treasury {
      crypto
      amount
      currentValue
      unrealizedGainPercent
    }
  }
}

# Compare multiple companies
query CompareCompanies {
  comparison(tickers: ["MSTR", "TSLA", "SQ"]) {
    companies {
      ticker
      name
      marketCap
      metrics
    }
    bestPerformers {
      byTreasuryValue
      byNavDiscount
    }
  }
}

# Get treasury summary
query TreasurySummary {
  treasurySummary {
    totalValue
    totalUnrealizedGain
    topHoldings {
      ticker
      name
      crypto
      value
    }
  }
}
```

### GraphQL Playground

Access the interactive GraphQL Playground at `/api/graphql/playground` (development only).

## Webhooks

Webhooks allow you to receive real-time notifications when events occur.

### Supported Events
- `company.created` - New company added
- `company.updated` - Company data updated
- `company.deleted` - Company removed
- `treasury.updated` - Treasury holdings changed
- `market.alert` - Market threshold triggered
- `analytics.threshold` - Analytics threshold crossed
- `system.error` - System error occurred

### Webhook Payload

```json
{
  "event": "treasury.updated",
  "data": {
    "ticker": "MSTR",
    "crypto": "BTC",
    "action": "purchase",
    "amount": 100,
    "value": 4500000
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "signature": "sha256=..."
}
```

### Webhook Security

All webhook payloads are signed using HMAC-SHA256. Verify the signature:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "ticker",
      "issue": "Required field missing"
    },
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "meta": {
    "version": "v1",
    "requestId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `INVALID_TOKEN` - Invalid authentication token
- `INVALID_API_KEY` - Invalid or inactive API key
- `INSUFFICIENT_SCOPES` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## API Documentation

### Interactive Documentation
- **Swagger UI**: `/api/v1/docs/ui`
- **ReDoc**: `/api/v1/docs/redoc`
- **OpenAPI Spec**: `/api/v1/docs`

### Client Examples
Get example code for various languages:
```bash
GET /api/v1/docs/examples?language=javascript
GET /api/v1/docs/examples?language=python
GET /api/v1/docs/examples?language=curl
```

## SDK Support

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Go
- Ruby

Community SDKs:
- PHP
- Java
- C#
- Rust

## Performance

The API is optimized for performance:
- Response caching with 5-minute TTL
- Database query optimization
- Connection pooling
- Gzip compression
- CDN distribution

Average response times:
- Simple queries: <100ms
- Complex analytics: <500ms
- Bulk exports: <2s

## Monitoring

Monitor API health and performance:
- Health check: `/api/monitoring/health`
- Metrics: `/api/monitoring/metrics`

## Support

- Documentation: https://docs.treasuryanalytics.com
- API Status: https://status.treasuryanalytics.com
- Support Email: api@treasuryanalytics.com
- GitHub Issues: https://github.com/treasuryanalytics/api/issues

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- REST and GraphQL endpoints
- Authentication and rate limiting
- Webhook support
- Data export capabilities
- Slack integration

### Upcoming Features
- WebSocket support for real-time data
- Additional export formats
- More third-party integrations
- Advanced analytics endpoints
- Machine learning predictions