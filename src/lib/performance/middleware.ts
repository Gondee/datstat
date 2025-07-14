// Performance optimization middleware for Next.js
// Separated from startup.ts to avoid Edge Runtime issues

export function performanceMiddleware(request: Request) {
  const startTime = Date.now();
  
  // Add performance headers
  const headers = new Headers({
    'X-Request-Start': startTime.toString(),
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  return headers;
}