#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Checks if all required environment variables and services are properly configured
 */

import dotenv from 'dotenv';
import { createConnection } from 'pg';

// Load environment variables
dotenv.config();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let hasErrors = false;
let hasWarnings = false;

function logError(message) {
  console.log(`${RED}❌ ${message}${RESET}`);
  hasErrors = true;
}

function logSuccess(message) {
  console.log(`${GREEN}✅ ${message}${RESET}`);
}

function logWarning(message) {
  console.log(`${YELLOW}⚠️  ${message}${RESET}`);
  hasWarnings = true;
}

function logInfo(message) {
  console.log(`${BLUE}ℹ️  ${message}${RESET}`);
}

async function validateEnvironment() {
  console.log(`${BLUE}🔍 Validating BillTracky Production Environment${RESET}\n`);

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    logSuccess(`Node.js version: ${nodeVersion}`);
  } else {
    logError(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }

  // Check required environment variables
  const requiredEnvVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'RESEND_API_KEY',
    'FROM_EMAIL',
    'APP_URL'
  ];

  logInfo('Checking required environment variables...');
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
    }
  });

  // Validate NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    logSuccess('NODE_ENV is set to production');
  } else {
    logWarning(`NODE_ENV is set to '${process.env.NODE_ENV}', expected 'production'`);
  }

  // Validate APP_URL
  if (process.env.APP_URL) {
    try {
      const url = new URL(process.env.APP_URL);
      if (url.protocol === 'https:') {
        logSuccess('APP_URL uses HTTPS');
      } else {
        logWarning('APP_URL should use HTTPS in production');
      }
    } catch (error) {
      logError('APP_URL is not a valid URL');
    }
  }

  // Validate FROM_EMAIL
  if (process.env.FROM_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(process.env.FROM_EMAIL)) {
      logSuccess('FROM_EMAIL format is valid');
    } else {
      logError('FROM_EMAIL format is invalid');
    }
  }

  // Test database connection
  if (process.env.DATABASE_URL) {
    logInfo('Testing database connection...');
    try {
      const client = new createConnection({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
      });

      await new Promise((resolve, reject) => {
        client.connect((err) => {
          if (err) {
            reject(err);
          } else {
            client.query('SELECT NOW()', (err, result) => {
              client.end();
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          }
        });
      });

      logSuccess('Database connection successful');
    } catch (error) {
      logError(`Database connection failed: ${error.message}`);
    }
  }

  // Test email service (Resend)
  if (process.env.RESEND_API_KEY) {
    logInfo('Testing email service configuration...');
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
      });

      if (response.ok) {
        logSuccess('Resend API key is valid');

        const domains = await response.json();
        const fromEmailDomain = process.env.FROM_EMAIL?.split('@')[1];

        if (fromEmailDomain) {
          const domainData = domains.data?.find(d => d.name === fromEmailDomain);
          if (domainData) {
            if (domainData.status === 'verified') {
              logSuccess(`Email domain ${fromEmailDomain} is verified`);
            } else {
              logWarning(`Email domain ${fromEmailDomain} is not verified (status: ${domainData.status})`);
            }
          } else {
            logWarning(`Email domain ${fromEmailDomain} not found in Resend account`);
          }
        }
      } else {
        logError(`Resend API key validation failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logError(`Email service test failed: ${error.message}`);
    }
  }

  // Check optional but recommended environment variables
  const recommendedEnvVars = [
    'SESSION_SECRET',
    'JWT_SECRET',
    'LOG_LEVEL'
  ];

  logInfo('Checking recommended environment variables...');
  recommendedEnvVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logWarning(`${varName} is not set (recommended for production)`);
    }
  });

  // Final summary
  console.log('\n' + '='.repeat(60));

  if (hasErrors) {
    console.log(`${RED}❌ Validation FAILED - ${hasErrors ? 'Fix errors before deploying' : ''}${RESET}`);
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${YELLOW}⚠️  Validation completed with warnings - Review warnings before deploying${RESET}`);
    process.exit(0);
  } else {
    console.log(`${GREEN}✅ Validation PASSED - Ready for production deployment!${RESET}`);
    process.exit(0);
  }
}

// Security checks
function checkSecurity() {
  logInfo('Running security checks...');

  // Check for weak secrets
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    logWarning('SESSION_SECRET should be at least 32 characters long');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logWarning('JWT_SECRET should be at least 32 characters long');
  }

  // Check for development secrets in production
  const dangerousSecrets = ['secret', 'password', 'admin', '123456', 'test'];
  dangerousSecrets.forEach(dangerous => {
    if (process.env.SESSION_SECRET?.toLowerCase().includes(dangerous)) {
      logError(`SESSION_SECRET contains weak pattern: ${dangerous}`);
    }
    if (process.env.JWT_SECRET?.toLowerCase().includes(dangerous)) {
      logError(`JWT_SECRET contains weak pattern: ${dangerous}`);
    }
  });
}

// Run validation
(async () => {
  try {
    await validateEnvironment();
    checkSecurity();
  } catch (error) {
    logError(`Validation script failed: ${error.message}`);
    process.exit(1);
  }
})();