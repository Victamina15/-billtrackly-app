// Session Validation Endpoint for Vercel Serverless
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, userSessions } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

// Database connection
let db;
let pool;

function getDatabase() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    db = drizzle(pool);
  }
  return db;
}

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

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const database = getDatabase();

    const [session] = await database
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session || session.expiresAt <= new Date()) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user data
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    const { password, emailVerificationToken, ...safeUser } = user;

    return res.status(200).json({
      valid: true,
      user: safeUser,
      expiresAt: session.expiresAt,
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation failed'
    });
  }
}