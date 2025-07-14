# DATstat Platform - Deployment Guide

## 🚀 Complete Production Deployment Guide

This guide walks you through deploying the fully functional DATstat platform with live data, database integration, and real-time features.

## Prerequisites

- **Vercel Account** with Pro plan (for databases)
- **GitHub Account** with repository access
- **API Keys** for external data sources
- **Domain** (optional but recommended)

## Step 1: Database Setup (Vercel Postgres)

### 1.1 Create Vercel Postgres Database
```bash
# In Vercel Dashboard:
# 1. Go to Storage tab
# 2. Click "Create Database"
# 3. Select "Postgres"
# 4. Choose region (recommend same as deployment)
# 5. Copy connection string
```

### 1.2 Set Environment Variables
In Vercel project settings, add:
```
DATABASE_URL=postgresql://username:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://username:password@host:port/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://username:password@host:port/database
```

## Step 2: External API Configuration

### 2.1 Get Required API Keys

**CoinGecko API** (Free tier available):
- Visit: https://www.coingecko.com/en/api
- Sign up for API key
- Free tier: 30 calls/minute

**Alpha Vantage API** (Free tier available):
- Visit: https://www.alphavantage.co/support/#api-key
- Sign up for API key  
- Free tier: 25 calls/day

**SEC EDGAR API** (Free):
- No API key required
- Need User-Agent string: "CompanyName (email@company.com)"

### 2.2 Set API Environment Variables
```
COINGECKO_API_KEY=your_coingecko_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
SEC_EDGAR_USER_AGENT=YourCompany (your-email@company.com)
```

## Step 3: Authentication Configuration

### 3.1 Generate JWT Secrets
```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.2 Set Authentication Variables
```
JWT_SECRET=your_generated_secret_key
JWT_REFRESH_SECRET=your_generated_refresh_key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Admin user for initial login
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_password
ADMIN_NAME=Administrator
```

## Step 4: Application Configuration

### 4.1 Set Application URLs
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_WS_URL=wss://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
```

### 4.2 Optional Integrations
```
# Slack notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Step 5: Database Migration & Seeding

### 5.1 Run Database Setup
```bash
# After deployment, run in Vercel Functions or locally:
npm run db:generate
npm run db:push
npm run db:seed
```

### 5.2 Apply Performance Optimizations
```bash
npm run db:optimize
```

## Step 6: Vercel Deployment Configuration

### 6.1 Update vercel.json
```json
{
  "functions": {
    "src/pages/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

### 6.2 Deploy to Vercel
```bash
# Connect GitHub repository to Vercel
# Auto-deploy on push to main branch
# Manual deploy:
vercel --prod
```

## Step 7: Post-Deployment Setup

### 7.1 Initialize Data Sources
```bash
# Hit the initialization endpoint
curl -X POST https://your-domain.vercel.app/api/data/refresh \
  -H "Authorization: Bearer your_admin_jwt_token"
```

### 7.2 Verify System Health
```bash
# Check health endpoint
curl https://your-domain.vercel.app/api/monitoring/health
```

### 7.3 Access Admin Panel
1. Go to: `https://your-domain.vercel.app/login`
2. Login with admin credentials
3. Complete initial setup in admin panel

## Step 8: Monitoring & Maintenance

### 8.1 Monitor System Health
- Visit: `https://your-domain.vercel.app/monitoring`
- Set up alerts for performance issues
- Monitor API usage and rate limits

### 8.2 Regular Maintenance
```bash
# Weekly: Clear old cache data
npm run cache:clear

# Monthly: Optimize database
npm run db:optimize

# As needed: Backup data
npm run backup:create
```

## Features Now Available

### ✅ **Live Data Integration**
- Real-time crypto prices from CoinGecko
- Live stock quotes from Alpha Vantage
- Automatic SEC filing updates

### ✅ **Admin Backend**
- Full CRUD for companies and treasury data
- User management with role-based access
- Data source monitoring and management
- Manual data override capabilities

### ✅ **Advanced Analytics**
- Real-time mNAV calculations
- Crypto yield analysis (MicroStrategy methodology)
- Dilution analysis and risk assessment
- Multi-company comparison tools

### ✅ **Interactive Visualizations**
- mNAV vs Stock Price comparison chart
- Real-time premium/discount tracking
- Treasury composition analysis
- Performance comparison dashboards

### ✅ **Production Features**
- JWT-based authentication
- Rate limiting and security
- Performance monitoring
- WebSocket real-time updates
- Mobile-responsive design

## API Documentation

After deployment, access interactive API documentation at:
- **Swagger UI**: `https://your-domain.vercel.app/api/v1/docs/ui`
- **ReDoc**: `https://your-domain.vercel.app/api/v1/docs/redoc`
- **GraphQL Playground**: `https://your-domain.vercel.app/api/graphql`

## Support & Troubleshooting

### Common Issues

**Database Connection Errors**:
- Verify DATABASE_URL is correct
- Check Vercel Postgres is running
- Ensure connection pooling is enabled

**API Rate Limits**:
- Monitor external API usage
- Upgrade API plans if needed
- Check rate limiting logs

**WebSocket Connection Issues**:
- Verify WS_URL is correct (wss:// for HTTPS)
- Check Vercel Function timeout limits
- Monitor connection count

### Debug Commands
```bash
# Check system health
curl https://your-domain.vercel.app/api/monitoring/health

# View performance metrics
curl https://your-domain.vercel.app/api/monitoring/metrics

# Test database connection
curl https://your-domain.vercel.app/api/db/health
```

## Security Checklist

- [ ] Strong JWT secrets generated
- [ ] Admin password changed from default
- [ ] API keys secured in environment variables
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled

## Success Metrics

Once deployed, you should have:
- ✅ Real-time data updating every 30-60 seconds
- ✅ Admin panel fully functional
- ✅ mNAV comparison chart on main dashboard
- ✅ Interactive analytics and visualizations
- ✅ System monitoring and alerts
- ✅ API documentation and external access

The platform is now production-ready with institutional-grade features!