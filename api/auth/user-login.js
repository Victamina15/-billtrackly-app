// User Login Endpoint for Vercel Serverless
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, organizations, userSessions } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const database = getDatabase();

    // Find user by email
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active (email verification no longer required)
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create session
    const [session] = await database
      .insert(userSessions)
      .values({
        userId: user.id,
        token: sessionToken,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();

    // Update last login
    await database
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Get organization info if exists
    let organization = null;
    if (user.organizationId) {
      const [org] = await database
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1);
      organization = org || null;
    }

    // Return safe user data
    const { password: _, emailVerificationToken, ...safeUser } = user;

    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
      organization,
      token: sessionToken,
      expiresAt: session.expiresAt,
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
    });
  }
}