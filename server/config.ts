import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  APP_URL: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'DATABASE_URL',
    'RESEND_API_KEY'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('📋 Required environment variables:');
    console.error('  - DATABASE_URL: PostgreSQL connection string');
    console.error('  - RESEND_API_KEY: Resend.com API key for email sending');
    console.error('📋 Optional environment variables:');
    console.error('  - FROM_EMAIL: Email address for sending (default: onboarding@resend.dev)');
    console.error('  - APP_URL: Base URL for the application (default: http://localhost:5000)');
    console.error('  - NODE_ENV: Environment mode (default: development)');
    console.error('  - PORT: Server port (default: 5000)');

    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@billtracky.com',
    APP_URL: process.env.APP_URL || 'http://localhost:5000',
  };
}

export const config = validateEnvironment();

// Log configuration (without sensitive data)
export function logConfiguration() {
  console.log('📋 Configuration Summary:');
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Port: ${config.PORT}`);
  console.log(`  Database: ${config.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Email API Key: ${config.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  From Email: ${config.FROM_EMAIL}`);
  console.log(`  App URL: ${config.APP_URL}`);

  if (config.NODE_ENV === 'development') {
    console.log('🔧 Development mode: Email will be redirected to robinsonsilverio1844@gmail.com');
  }
}