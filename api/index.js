// Vercel Serverless Function for BillTracky API
// Complete authentication system for registration and login

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, organizations, userSessions } from '../shared/schema.js';
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
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    db = drizzle(pool);
  }
  return db;
}

// Validation schemas (simplified)
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
    // Parse request body for POST requests
    let body = {};
    if (req.method === 'POST' && req.body) {
      body = req.body;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      return res.status(200).json({
        status: 'ok',
        environment: 'vercel-serverless',
        timestamp: new Date().toISOString(),
        message: 'BillTracky API is running on Vercel'
      });
    }

    // User Registration
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const startTime = Date.now();
      console.log(`[PERF] Registration started for ${body.email}`);

      const { organizationData, ...userData } = body;

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
            planId: null, // Will be set based on plan selection
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
          isEmailVerified: true, // Set as verified immediately
          isActive: true, // Set as active immediately
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
    }

    // User Login
    if (pathname === '/api/auth/user-login' && req.method === 'POST') {
      const { email, password } = body;

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
    }

    // Employee Login (access code)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { accessCode } = body;

      if (!accessCode) {
        return res.status(400).json({ message: "Access code is required" });
      }

      // For now, return a simple response since employee management
      // would require the full storage layer
      return res.status(200).json({
        message: "Employee login endpoint - requires full storage implementation",
        accessCode: accessCode
      });
    }

    // Session validation endpoint
    if (pathname === '/api/auth/validate' && req.method === 'POST') {
      const { token } = body;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const database = getDatabase();

      const [session] = await database
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.token, token),
        ))
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
    }

    // Test endpoint
    if (pathname === '/api/test') {
      return res.status(200).json({
        message: 'API is working',
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
          '/api/health',
          '/api/auth/register',
          '/api/auth/user-login',
          '/api/auth/login',
          '/api/auth/validate',
          '/api/test'
        ]
      });
    }

    // Default 404 for other routes
    return res.status(404).json({
      message: 'API endpoint not found',
      availableEndpoints: [
        '/api/health',
        '/api/auth/register',
        '/api/auth/user-login',
        '/api/auth/login',
        '/api/auth/validate',
        '/api/test'
      ]
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred processing your request'
    });
  } finally {
    // Close database connection for serverless
    if (pool) {
      // Don't close the pool immediately in serverless, let it timeout
      // pool.end();
    }
  }
}