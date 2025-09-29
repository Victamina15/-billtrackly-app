// Health Check Endpoint for Vercel Serverless
export default async function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = [
    'https://billtracky.com',
    'https://www.billtracky.com',
    'https://billtracky.vercel.app',
    'https://billtracky-app.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    return res.status(200).json({
      status: 'ok',
      environment: 'vercel-serverless',
      timestamp: new Date().toISOString(),
      message: 'BillTracky API is running on Vercel',
      endpoints: {
        health: '/api/health',
        register: '/api/auth/register',
        login: '/api/auth/user-login',
        validate: '/api/auth/validate'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}