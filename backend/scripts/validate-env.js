#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Validates that all required environment variables are set
 * and provides helpful guidance for missing or invalid values
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// Define required and optional environment variables with validation rules
const envConfig = {
  required: {
    // Core Application
    NODE_ENV: {
      description: 'Application environment',
      validate: (val) => ['development', 'staging', 'production', 'test'].includes(val),
      example: 'development',
      errorMsg: 'Must be one of: development, staging, production, test',
    },
    PORT: {
      description: 'Server port number',
      validate: (val) => !isNaN(val) && val > 0 && val < 65536,
      example: '3001',
      errorMsg: 'Must be a valid port number (1-65535)',
    },
    DATABASE_URL: {
      description: 'PostgreSQL connection string',
      validate: (val) => {
        try {
          const url = new URL(val);
          return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
        } catch {
          return false;
        }
      },
      example: 'postgresql://user:password@localhost:5432/database',
      errorMsg: 'Must be a valid PostgreSQL connection string',
    },

    // Clerk Authentication
    CLERK_PUBLISHABLE_KEY: {
      description: 'Clerk publishable key',
      validate: (val) => val.startsWith('pk_'),
      example: 'pk_test_xxxxx',
      errorMsg: 'Must start with "pk_"',
    },
    CLERK_SECRET_KEY: {
      description: 'Clerk secret key',
      validate: (val) => val.startsWith('sk_'),
      example: 'sk_test_xxxxx',
      errorMsg: 'Must start with "sk_"',
      sensitive: true,
    },

    // Security
    JWT_SECRET: {
      description: 'JWT signing secret',
      validate: (val) => val.length >= 32,
      example: 'Generate with: openssl rand -hex 32',
      errorMsg: 'Must be at least 32 characters long',
      sensitive: true,
    },
    ENCRYPTION_KEY: {
      description: 'Data encryption key',
      validate: (val) => val.length === 32,
      example: 'Must be exactly 32 characters',
      errorMsg: 'Must be exactly 32 characters long',
      sensitive: true,
    },
  },

  optional: {
    // Application
    API_VERSION: {
      description: 'API version prefix',
      validate: (val) => /^v\d+$/.test(val),
      example: 'v1',
    },
    LOG_LEVEL: {
      description: 'Logging level',
      validate: (val) => ['error', 'warn', 'info', 'debug'].includes(val),
      example: 'debug',
    },
    PRETTY_LOGS: {
      description: 'Pretty print logs',
      validate: (val) => ['true', 'false'].includes(val),
      example: 'true',
    },

    // Redis
    REDIS_URL: {
      description: 'Redis connection URL',
      validate: (val) => {
        try {
          const url = new URL(val);
          return url.protocol === 'redis:' || url.protocol === 'rediss:';
        } catch {
          return false;
        }
      },
      example: 'redis://localhost:6379',
    },

    // Email Service
    POSTMARK_API_KEY: {
      description: 'Postmark API key',
      validate: (val) => val.length > 0,
      example: 'Your Postmark API key',
      sensitive: true,
    },
    POSTMARK_FROM_EMAIL: {
      description: 'Email sender address',
      validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      example: 'noreply@example.com',
    },

    // CORS
    ALLOWED_ORIGINS: {
      description: 'Allowed CORS origins',
      validate: (val) => val.length > 0,
      example: 'http://localhost:3000,http://localhost:3001',
    },
    CORS_CREDENTIALS: {
      description: 'Allow credentials in CORS',
      validate: (val) => ['true', 'false'].includes(val),
      example: 'true',
    },

    // Swagger
    SWAGGER_ENABLED: {
      description: 'Enable Swagger documentation',
      validate: (val) => ['true', 'false'].includes(val),
      example: 'true',
    },
    SWAGGER_PATH: {
      description: 'Swagger documentation path',
      validate: (val) => val.startsWith('/'),
      example: '/api/docs',
    },

    // Clerk Webhook (if using webhooks)
    CLERK_WEBHOOK_SECRET: {
      description: 'Clerk webhook signing secret',
      validate: (val) => val.startsWith('whsec_'),
      example: 'whsec_xxxxx',
      sensitive: true,
    },
  },
};

// Load environment variables
function loadEnv() {
  const envFile = path.join(process.cwd(), '.env');
  const envExampleFile = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envFile)) {
    console.log(`${colors.yellow}⚠️  No .env file found${colors.reset}`);
    
    if (fs.existsSync(envExampleFile)) {
      console.log(`${colors.cyan}💡 Tip: Copy .env.example to .env and configure it:${colors.reset}`);
      console.log(`   cp .env.example .env`);
    }
    console.log();
  }
  
  // Load dotenv
  require('dotenv').config();
  
  return process.env;
}

// Validate a single environment variable
function validateVar(name, config, value) {
  const result = {
    name,
    valid: false,
    value: value,
    message: '',
  };

  if (!value) {
    result.message = 'Not set';
    return result;
  }

  if (config.sensitive) {
    result.value = value.substring(0, 10) + '...' + value.substring(value.length - 4);
  }

  if (config.validate && !config.validate(value)) {
    result.message = config.errorMsg || 'Invalid value';
    return result;
  }

  result.valid = true;
  result.message = 'Valid';
  return result;
}

// Main validation function
function validateEnvironment() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║          Gloria Backend - Environment Validator         ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();

  const env = loadEnv();
  const results = {
    required: { valid: 0, invalid: 0, items: [] },
    optional: { valid: 0, invalid: 0, items: [] },
  };

  // Validate required variables
  console.log(`${colors.cyan}📋 Required Environment Variables:${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(58)}${colors.reset}`);
  
  for (const [name, config] of Object.entries(envConfig.required)) {
    const result = validateVar(name, config, env[name]);
    results.required.items.push(result);
    
    if (result.valid) {
      results.required.valid++;
      console.log(`${colors.green}✓${colors.reset} ${name.padEnd(25)} ${colors.dim}${result.value}${colors.reset}`);
    } else {
      results.required.invalid++;
      console.log(`${colors.red}✗${colors.reset} ${name.padEnd(25)} ${colors.red}${result.message}${colors.reset}`);
      console.log(`  ${colors.dim}↳ ${config.description}${colors.reset}`);
      console.log(`  ${colors.dim}↳ Example: ${config.example}${colors.reset}`);
    }
  }

  // Validate optional variables
  console.log();
  console.log(`${colors.cyan}📋 Optional Environment Variables:${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(58)}${colors.reset}`);
  
  for (const [name, config] of Object.entries(envConfig.optional)) {
    const value = env[name];
    if (!value) continue; // Skip unset optional variables
    
    const result = validateVar(name, config, value);
    results.optional.items.push(result);
    
    if (result.valid) {
      results.optional.valid++;
      console.log(`${colors.green}✓${colors.reset} ${name.padEnd(25)} ${colors.dim}${result.value}${colors.reset}`);
    } else {
      results.optional.invalid++;
      console.log(`${colors.yellow}⚠${colors.reset} ${name.padEnd(25)} ${colors.yellow}${result.message}${colors.reset}`);
      console.log(`  ${colors.dim}↳ ${config.description}${colors.reset}`);
      console.log(`  ${colors.dim}↳ Example: ${config.example}${colors.reset}`);
    }
  }

  // Summary
  console.log();
  console.log(`${colors.cyan}📊 Validation Summary:${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(58)}${colors.reset}`);
  
  const requiredStatus = results.required.invalid === 0 ? 
    `${colors.green}✓ All required variables are valid${colors.reset}` :
    `${colors.red}✗ ${results.required.invalid} required variable(s) need attention${colors.reset}`;
  
  const optionalStatus = results.optional.invalid === 0 ?
    `${colors.green}✓ All set optional variables are valid${colors.reset}` :
    `${colors.yellow}⚠ ${results.optional.invalid} optional variable(s) have issues${colors.reset}`;

  console.log(`Required: ${requiredStatus}`);
  console.log(`Optional: ${optionalStatus}`);

  // Environment detection
  console.log();
  console.log(`${colors.cyan}🔍 Environment Detection:${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(58)}${colors.reset}`);
  console.log(`Current environment: ${colors.blue}${env.NODE_ENV || 'not set'}${colors.reset}`);
  console.log(`Server port: ${colors.blue}${env.PORT || 'not set'}${colors.reset}`);
  console.log(`Database: ${colors.blue}${env.DATABASE_URL ? 'Configured' : 'Not configured'}${colors.reset}`);
  console.log(`Clerk Auth: ${colors.blue}${env.CLERK_SECRET_KEY ? 'Configured' : 'Not configured'}${colors.reset}`);
  console.log(`Redis Cache: ${colors.blue}${env.REDIS_URL ? 'Configured' : 'Not configured'}${colors.reset}`);
  console.log(`Email Service: ${colors.blue}${env.POSTMARK_API_KEY ? 'Configured' : 'Not configured'}${colors.reset}`);

  // Exit code
  const exitCode = results.required.invalid > 0 ? 1 : 0;
  
  console.log();
  if (exitCode === 0) {
    console.log(`${colors.green}✅ Environment configuration is valid!${colors.reset}`);
    console.log(`${colors.dim}Ready to start the application.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Environment configuration has errors!${colors.reset}`);
    console.log(`${colors.dim}Please fix the issues above before starting the application.${colors.reset}`);
  }
  console.log();

  process.exit(exitCode);
}

// Run validation
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment, envConfig };