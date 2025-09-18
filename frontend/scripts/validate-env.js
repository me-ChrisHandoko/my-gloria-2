#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * This script validates that all required environment variables are present
 * before building or starting the application.
 *
 * Usage:
 *   node scripts/validate-env.js
 *   npm run validate:env
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Required environment variables by environment
const requiredEnvVars = {
  common: [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ],
  development: [
    // Additional development-specific requirements
  ],
  staging: [
    // Additional staging-specific requirements
    'CLERK_SECRET_KEY',
  ],
  production: [
    // Additional production-specific requirements
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SENTRY_DSN',
    'SESSION_SECRET',
    'REDIS_URL',
  ],
};

// Optional but recommended environment variables
const recommendedEnvVars = [
  'NEXT_PUBLIC_API_VERSION',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_VERSION',
  'NEXT_PUBLIC_ENV',
  'NEXT_PUBLIC_ENABLE_ANALYTICS',
  'NEXT_PUBLIC_CDN_URL',
];

// Validation rules for specific variables
const validationRules = {
  NEXT_PUBLIC_API_URL: (value) => {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Must be a valid URL' };
    }
  },
  NEXT_PUBLIC_APP_URL: (value) => {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Must be a valid URL' };
    }
  },
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: (value) => {
    if (!value.startsWith('pk_')) {
      return { valid: false, error: 'Must start with "pk_"' };
    }
    return { valid: true };
  },
  CLERK_SECRET_KEY: (value) => {
    if (value && !value.startsWith('sk_')) {
      return { valid: false, error: 'Must start with "sk_"' };
    }
    return { valid: true };
  },
  SESSION_SECRET: (value) => {
    if (value && value.length < 32) {
      return { valid: false, error: 'Must be at least 32 characters long' };
    }
    return { valid: true };
  },
  NEXT_PUBLIC_ENV: (value) => {
    const validEnvs = ['development', 'staging', 'production'];
    if (value && !validEnvs.includes(value)) {
      return { valid: false, error: `Must be one of: ${validEnvs.join(', ')}` };
    }
    return { valid: true };
  },
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) {
      return;
    }

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      env[key.trim()] = value;
    }
  });

  return env;
}

function validateEnvironment() {
  console.log(`${colors.cyan}🔍 Validating environment variables...${colors.reset}\n`);

  const environment = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development';
  console.log(`${colors.blue}📋 Environment: ${environment}${colors.reset}\n`);

  // Load .env files
  const envFiles = [
    '.env',
    '.env.local',
    `.env.${environment}`,
    `.env.${environment}.local`,
  ];

  let combinedEnv = { ...process.env };

  envFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const fileEnv = loadEnvFile(filePath);
      combinedEnv = { ...combinedEnv, ...fileEnv };
      console.log(`${colors.green}✓${colors.reset} Loaded: ${file}`);
    }
  });

  console.log();

  // Check required variables
  const requiredVars = [
    ...requiredEnvVars.common,
    ...(requiredEnvVars[environment] || []),
  ];

  let hasErrors = false;
  const errors = [];
  const warnings = [];

  console.log(`${colors.cyan}📌 Checking required variables:${colors.reset}`);
  requiredVars.forEach((varName) => {
    const value = combinedEnv[varName];

    if (!value) {
      errors.push(`  ${colors.red}✗${colors.reset} ${varName}: Missing required variable`);
      hasErrors = true;
    } else {
      // Validate the value if there's a rule
      if (validationRules[varName]) {
        const validation = validationRules[varName](value);
        if (!validation.valid) {
          errors.push(`  ${colors.red}✗${colors.reset} ${varName}: ${validation.error}`);
          hasErrors = true;
        } else {
          console.log(`  ${colors.green}✓${colors.reset} ${varName}`);
        }
      } else {
        console.log(`  ${colors.green}✓${colors.reset} ${varName}`);
      }
    }
  });

  if (errors.length > 0) {
    console.log(`\n${colors.red}❌ Errors:${colors.reset}`);
    errors.forEach((error) => console.log(error));
  }

  console.log(`\n${colors.cyan}💡 Checking recommended variables:${colors.reset}`);
  recommendedEnvVars.forEach((varName) => {
    const value = combinedEnv[varName];

    if (!value) {
      warnings.push(`  ${colors.yellow}⚠${colors.reset}  ${varName}: Recommended but not set`);
    } else {
      // Validate the value if there's a rule
      if (validationRules[varName]) {
        const validation = validationRules[varName](value);
        if (!validation.valid) {
          warnings.push(`  ${colors.yellow}⚠${colors.reset}  ${varName}: ${validation.error}`);
        } else {
          console.log(`  ${colors.green}✓${colors.reset} ${varName}`);
        }
      } else {
        console.log(`  ${colors.green}✓${colors.reset} ${varName}`);
      }
    }
  });

  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Warnings:${colors.reset}`);
    warnings.forEach((warning) => console.log(warning));
  }

  // Summary
  console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
  console.log(`  Total required: ${requiredVars.length}`);
  console.log(`  Total recommended: ${recommendedEnvVars.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  if (hasErrors) {
    console.log(`\n${colors.red}❌ Environment validation failed!${colors.reset}`);
    console.log(`\n${colors.yellow}💡 Tip: Copy .env.example to .env.local and fill in the required values.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ Environment validation passed!${colors.reset}`);
  }
}

// Run validation
validateEnvironment();