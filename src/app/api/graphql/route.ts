import { NextRequest, NextResponse } from 'next/server';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@/api/graphql/schema';
import { resolvers } from '@/api/graphql/resolvers';
import { authenticate } from '@/api/middleware/auth';
import { rateLimit } from '@/api/middleware/rateLimit';
import { GraphQLContext } from '@/api/types';

// Create Apollo Server
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    {
      async requestDidStart() {
        return {
          async willSendResponse(requestContext) {
            // Add performance timing
            const { response } = requestContext;
            response.http.headers.set(
              'X-Response-Time',
              `${Date.now() - requestContext.contextValue.startTime}ms`
            );
          },
        };
      },
    },
  ],
});

// Create Next.js handler
const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(server, {
  context: async (req) => {
    const startTime = Date.now();
    
    // Apply rate limiting
    const { allowed, error: rateLimitError } = await rateLimit(req, {
      windowMs: 60000,
      max: 100, // 100 GraphQL requests per minute
    });

    if (!allowed && rateLimitError) {
      throw new Error('Rate limit exceeded');
    }

    // Apply authentication
    const { user, apiKey } = await authenticate(req, { requireAuth: false });

    return {
      startTime,
      user,
      apiKey,
      dataSources: {
        companyAPI: null, // Initialize data sources if needed
        treasuryAPI: null,
        marketAPI: null,
        analyticsAPI: null,
      },
    };
  },
});

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

// GraphQL Playground HTML
const playgroundHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Treasury Analytics - GraphQL Playground</title>
  <link rel="stylesheet" href="https://unpkg.com/graphql-playground-react/build/static/css/index.css" />
  <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
    #root {
      height: 100%;
    }
    .graphql-playground {
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function () {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/api/graphql',
        settings: {
          'theme.editorTheme': 'dark',
          'theme.theme': 'dark',
          'request.credentials': 'include',
          'schema.polling.enable': true,
          'schema.polling.interval': 2000,
        },
        tabs: [
          {
            endpoint: '/api/graphql',
            query: \`# Welcome to Treasury Analytics GraphQL API
# 
# Example queries:

query GetCompany {
  company(ticker: "MSTR") {
    ticker
    name
    sector
    marketCap
    treasury {
      crypto
      amount
      currentValue
      unrealizedGainPercent
    }
  }
}

query GetTreasurySummary {
  treasurySummary {
    totalValue
    totalUnrealizedGain
    totalUnrealizedGainPercent
    topHoldings {
      ticker
      name
      crypto
      value
      percentOfMarketCap
    }
  }
}

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
      byYield
    }
  }
}

# Example mutation (requires authentication):
# mutation AddTransaction {
#   addTreasuryTransaction(
#     ticker: "MSTR"
#     crypto: BTC
#     transaction: {
#       date: "2024-01-15T10:00:00Z"
#       amount: 100
#       pricePerUnit: 45000
#       totalCost: 4500000
#       type: PURCHASE
#     }
#   ) {
#     crypto
#     amount
#     currentValue
#   }
# }
\`,
          },
        ],
      });
    });
  </script>
</body>
</html>
`;

// GET /api/graphql/playground
async function getPlayground(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('GraphQL Playground disabled in production', { status: 404 });
  }

  return new NextResponse(playgroundHTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}