// Vercel Serverless Function for BillTracky API
// This handles all API requests in a serverless environment

export default async function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = [
    'https://billtracky.com',
    'https://www.billtracky.com',
    'https://billtracky.vercel.app',
    'https://billtracky-app.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  try {
    // Health check endpoint
    if (req.url === '/api/health' || req.url === '/health') {
      return res.status(200).json({
        status: 'ok',
        environment: 'vercel-serverless',
        timestamp: new Date().toISOString(),
        message: 'BillTracky API is running on Vercel'
      });
    }

    // Basic API endpoints for testing
    if (req.url === '/api/test') {
      return res.status(200).json({
        message: 'API is working',
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }

    // Default 404 for other routes (will be implemented with full Express app)
    return res.status(404).json({
      message: 'API endpoint not found. Full API implementation coming soon.',
      availableEndpoints: ['/api/health', '/api/test']
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}