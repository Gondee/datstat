# Digital Asset Treasury (DAT) Analytics Platform - Deployment Guide

## Database Setup ✅

Your database has been successfully set up with:
- All required tables and schemas
- Initial seed data including:
  - Admin user: `admin@datstat.com` (password: `admin123`)
  - Test users: `editor@datstat.com`, `viewer@datstat.com` (password: `password123`)
  - Sample companies: MicroStrategy (MSTR), Tesla (TSLA), Coinbase (COIN)
  - Treasury holdings and historical data

## Required Environment Variables on Vercel

Add these in your Vercel project settings under Settings → Environment Variables:

### Required:
- `DATABASE_URL`: Your Prisma Accelerate connection string (use the one starting with `prisma+postgres://`)
- `JWT_SECRET`: `XN8gQxTmW1htazspTlSTTdd07BAWpu32zLIVadb0oaA=` (or generate your own)

### Optional (for full functionality):
- `COINGECKO_API_KEY`: For real-time crypto prices
- `ALPHA_VANTAGE_API_KEY`: For stock market data
- `SEC_API_KEY`: For SEC filings data

## Next Steps

1. Add the environment variables in Vercel
2. Redeploy your application (it should happen automatically after adding env vars)
3. Access your app at your Vercel URL
4. Login with admin credentials to start using the platform

## Features Available

- Company treasury management
- Real-time NAV calculations
- Crypto yield analytics
- Risk assessment dashboards
- Comparative analysis tools
- Admin panel for data management

## Troubleshooting

If you encounter issues:
1. Check Vercel logs for errors
2. Ensure all environment variables are set correctly
3. The database connection uses Prisma Accelerate for better performance

## Security Notes

- Change the default passwords immediately after first login
- The JWT_SECRET provided is just an example - you should generate your own for production
- Consider enabling 2FA for admin accounts