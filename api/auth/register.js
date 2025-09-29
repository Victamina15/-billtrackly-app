// User Registration Endpoint for Vercel Serverless
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, organizations } from '../../shared/schema.js';
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

function validateRegistration(data) {
  const errors = [];

  if (!data.firstName || data.firstName.length < 2) {
    errors.push('First name must be at least 2 characters');
  }

  if (!data.lastName || data.lastName.length < 2) {
    errors.push('Last name must be at least 2 characters');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return { valid: errors.length === 0, errors };
}

function validateOrganization(data) {
  const errors = [];

  if (!data.name || data.name.length < 2) {
    errors.push('Organization name must be at least 2 characters');
  }

  if (!data.phone || data.phone.length < 10) {
    errors.push('Valid phone number is required');
  }

  return { valid: errors.length === 0, errors };
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
    const startTime = Date.now();
    const { organizationData, ...userData } = req.body;

    console.log(`[PERF] Registration started for ${userData.email}`);

    // Validate user data
    const userValidation = validateRegistration(userData);
    if (!userValidation.valid) {
      return res.status(400).json({
        message: 'Invalid user data',
        errors: userValidation.errors
      });
    }

    const database = getDatabase();

    // Check if user already exists
    const existingUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash password
    const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 8;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    let organizationId = null;

    // Create organization if provided
    if (organizationData) {
      const orgValidation = validateOrganization(organizationData);
      if (!orgValidation.valid) {
        return res.status(400).json({
          message: 'Invalid organization data',
          errors: orgValidation.errors
        });
      }

      // Check if subdomain is taken (if provided)
      if (organizationData.subdomain) {
        const existingOrgs = await database
          .select()
          .from(organizations)
          .where(eq(organizations.subdomain, organizationData.subdomain))
          .limit(1);

        if (existingOrgs.length > 0) {
          return res.status(400).json({ message: "Subdomain is already taken" });
        }
      }

      // Create organization
      const [organization] = await database
        .insert(organizations)
        .values({
          name: organizationData.name,
          phone: organizationData.phone,
          subdomain: organizationData.subdomain || null,
          email: organizationData.email || null,
          address: organizationData.address || null,
          city: organizationData.city || null,
          country: organizationData.country || "Dominican Republic",
          planId: null,
          subscriptionStatus: "active",
          isTrialActive: true,
        })
        .returning();

      organizationId = organization.id;
    }

    // Create user as verified and active immediately
    const [user] = await database
      .insert(users)
      .values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        organizationId,
        role: organizationId ? 'owner' : 'owner',
        isEmailVerified: true,
        isActive: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .returning();

    // Remove sensitive data from response
    const { password, emailVerificationToken, ...safeUser } = user;

    const responseTime = Date.now() - startTime;
    console.log(`[PERF] Registration completed in ${responseTime}ms - ready to login`);

    return res.status(201).json({
      message: organizationId
        ? "User and organization registered successfully. You can now log in."
        : "User registered successfully. You can now log in.",
      user: safeUser,
      organizationCreated: !!organizationId,
      canLoginImmediately: true,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Registration failed'
    });
  }
}