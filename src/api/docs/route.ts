import { NextRequest, NextResponse } from 'next/server';
import { generateOpenAPISpec } from './generator';

// GET /api/v1/docs
export async function GET(req: NextRequest): Promise<NextResponse> {
  const spec = generateOpenAPISpec();
  
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}

// Swagger UI HTML
const swaggerUIHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Treasury Analytics Platform - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0a0a0a;
    }
    .swagger-ui .topbar {
      background-color: #1a1a1a;
      border-bottom: 1px solid #00ff41;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info .title {
      color: #00ff41;
    }
    .swagger-ui .scheme-container {
      background: #1a1a1a;
      border: 1px solid #00ff41;
    }
    .swagger-ui .btn.authorize {
      background-color: #00ff41;
      color: #0a0a0a;
      border-color: #00ff41;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #00cc33;
      border-color: #00cc33;
    }
    .swagger-ui select {
      background: #1a1a1a;
      color: #00ff41;
      border: 1px solid #00ff41;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary {
      border-color: #00ff41;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: #ff9800;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary {
      border-color: #2196f3;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary {
      border-color: #f44336;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/docs',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        persistAuthorization: true,
        onComplete: () => {
          console.log('Swagger UI loaded');
        }
      });
    };
  </script>
</body>
</html>
`;

// GET /api/v1/docs/ui
export async function getSwaggerUI(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(swaggerUIHTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// ReDoc HTML
const redocHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Treasury Analytics Platform - API Reference</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
    }
    #redoc-container {
      background: #0a0a0a;
    }
    /* Custom theme for terminal look */
    .sc-eCImvq {
      background: #1a1a1a !important;
    }
    .sc-gKclnd {
      color: #00ff41 !important;
    }
    .sc-furwcr {
      background: #1a1a1a !important;
      border-color: #00ff41 !important;
    }
    .sc-pVTma {
      color: #00ff41 !important;
    }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/api/v1/docs', {
      theme: {
        colors: {
          primary: {
            main: '#00ff41'
          },
          success: {
            main: '#00ff41'
          },
          warning: {
            main: '#ff9800'
          },
          error: {
            main: '#f44336'
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0'
          },
          background: {
            primary: '#0a0a0a',
            secondary: '#1a1a1a'
          },
          border: {
            dark: '#00ff41',
            light: '#00ff4150'
          }
        },
        typography: {
          fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          code: {
            fontSize: '13px',
            fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
            backgroundColor: '#1a1a1a',
            color: '#00ff41'
          },
          headings: {
            fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
            color: '#00ff41'
          }
        },
        sidebar: {
          backgroundColor: '#1a1a1a',
          textColor: '#00ff41',
          activeTextColor: '#ffffff'
        },
        rightPanel: {
          backgroundColor: '#0a0a0a'
        }
      },
      scrollYOffset: 0,
      hideDownloadButton: false,
      disableSearch: false,
      nativeScrollbars: false,
      pathInMiddlePanel: true,
      untrustedSpec: false,
      expandResponses: '200,201',
      jsonSampleExpandLevel: 2,
      sortPropsAlphabetically: true,
      payloadSampleIdx: 0,
      showExtensions: true,
      hideSingleRequestSampleTab: false,
      hideRequestPayloadSample: false
    }, document.getElementById('redoc-container'));
  </script>
</body>
</html>
`;

// GET /api/v1/docs/redoc
export async function getRedoc(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(redocHTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// API client examples
const clientExamples = {
  javascript: `
// JavaScript/TypeScript Example
import axios from 'axios';

const API_KEY = 'your-api-key';
const BASE_URL = 'https://api.treasuryanalytics.com/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Get company data
async function getCompany(ticker) {
  const response = await client.get(\`/companies/\${ticker}\`);
  return response.data.data;
}

// Get treasury holdings
async function getTreasuryHoldings(ticker) {
  const response = await client.get('/treasury', {
    params: { ticker },
  });
  return response.data.data;
}

// Example usage
(async () => {
  try {
    const company = await getCompany('MSTR');
    console.log('Company:', company);
    
    const holdings = await getTreasuryHoldings('MSTR');
    console.log('Treasury Holdings:', holdings);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
})();
`,
  python: `
# Python Example
import requests
from typing import Dict, Any

API_KEY = 'your-api-key'
BASE_URL = 'https://api.treasuryanalytics.com/v1'

class TreasuryAnalyticsAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json',
        })
    
    def get_company(self, ticker: str) -> Dict[str, Any]:
        """Get company data by ticker"""
        response = self.session.get(f'{BASE_URL}/companies/{ticker}')
        response.raise_for_status()
        return response.json()['data']
    
    def get_treasury_holdings(self, ticker: str = None) -> Dict[str, Any]:
        """Get treasury holdings"""
        params = {'ticker': ticker} if ticker else {}
        response = self.session.get(f'{BASE_URL}/treasury', params=params)
        response.raise_for_status()
        return response.json()['data']
    
    def get_analytics(self, ticker: str) -> Dict[str, Any]:
        """Get comprehensive analytics for a company"""
        response = self.session.get(f'{BASE_URL}/analytics/comprehensive/{ticker}')
        response.raise_for_status()
        return response.json()['data']

# Example usage
if __name__ == '__main__':
    api = TreasuryAnalyticsAPI(API_KEY)
    
    try:
        # Get company data
        company = api.get_company('MSTR')
        print(f"Company: {company['name']} ({company['ticker']})")
        
        # Get treasury holdings
        holdings = api.get_treasury_holdings('MSTR')
        print(f"Treasury Holdings: {len(holdings)} entries")
        
        # Get analytics
        analytics = api.get_analytics('MSTR')
        nav_per_share = analytics['currentMetrics']['nav']['navPerShare']
        print(f"NAV per share: ${{nav_per_share:.2f}}")
        
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
`,
  curl: `
# cURL Examples

# Set your API key
API_KEY="your-api-key"
BASE_URL="https://api.treasuryanalytics.com/v1"

# Get company data
curl -X GET "$BASE_URL/companies/MSTR" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Accept: application/json"

# Get all companies with pagination
curl -X GET "$BASE_URL/companies?page=1&limit=20&sort=marketCap&order=desc" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Accept: application/json"

# Get treasury holdings for a specific company
curl -X GET "$BASE_URL/treasury?ticker=MSTR" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Accept: application/json"

# Get comprehensive analytics
curl -X GET "$BASE_URL/analytics/comprehensive/MSTR" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Accept: application/json"

# Add a treasury transaction (Admin only)
curl -X POST "$BASE_URL/treasury/MSTR/BTC/transactions" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2024-01-15T10:00:00Z",
    "amount": 100,
    "pricePerUnit": 45000,
    "totalCost": 4500000,
    "type": "purchase",
    "fundingMethod": "equity"
  }'

# Export data to CSV
curl -X GET "$BASE_URL/export/companies?format=csv" \\
  -H "X-API-Key: $API_KEY" \\
  -o companies.csv

# Create a webhook
curl -X POST "$BASE_URL/webhooks" \\
  -H "X-API-Key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["treasury.updated", "market.alert"]
  }'
`,
};

// GET /api/v1/docs/examples
export async function getExamples(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const language = searchParams.get('language') || 'all';

  if (language !== 'all' && !(language in clientExamples)) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_LANGUAGE',
        message: 'Invalid language. Available: javascript, python, curl',
        timestamp: new Date().toISOString(),
      },
    }, { status: 400 });
  }

  const examples = language === 'all' ? clientExamples : { [language]: clientExamples[language as keyof typeof clientExamples] };

  return NextResponse.json({
    success: true,
    data: examples,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  });
}