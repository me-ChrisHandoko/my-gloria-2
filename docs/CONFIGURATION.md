# Configuration Management Guide

## Overview

The Gloria system uses a comprehensive configuration management system with validation, type safety, and production-ready best practices. This guide covers both backend and frontend configuration.

## Quick Start

### Backend Setup

1. Copy the appropriate environment template:
```bash
# For development
cp .env.example .env

# For production
cp .env.production.example .env.production
```

2. Fill in required values (see Required Configuration section below)

3. Start the application:
```bash
npm run start:dev  # Development
npm run start:prod # Production
```

### Frontend Setup

1. Copy the appropriate environment template:
```bash
# For development
cp .env.example .env.local

# For production
cp .env.production.example .env.production.local
```

2. Fill in required values (see Required Configuration section below)

3. Start the application:
```bash
npm run dev   # Development
npm run build # Production build
npm run start # Production server
```

## Required Configuration

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/gloria` |
| `CLERK_SECRET_KEY` | Clerk authentication secret key | `sk_test_abc123...` or `sk_live_xyz789...` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` or `https://api.yourdomain.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_abc123...` or `pk_live_xyz789...` |

## Configuration Validation

### Backend Validation

The backend automatically validates configuration on startup:

```typescript
// Validation happens automatically on application start
// Check validation status:
GET /api/v1/config/health

// Response:
{
  "healthy": true,
  "required": 2,
  "missing": 0,
  "warnings": []
}
```

### Frontend Validation

The frontend provides configuration validation utilities:

```typescript
import { getConfigHealth, validateRuntimeConfig } from '@/lib/config/config-validation';

// Check configuration health
const health = getConfigHealth();
if (!health.healthy) {
  console.error('Missing configuration:', health.missing);
}

// Validate configuration
const validation = validateRuntimeConfig();
if (!validation.success) {
  console.error('Configuration errors:', validation.errors);
}
```

## Environment-Specific Configuration

### Development Environment

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/gloria_dev
CLERK_SECRET_KEY=sk_test_your_test_key
LOG_LEVEL=debug
```

### Staging Environment

```env
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://stage_user:stage_pass@stage-db:5432/gloria_stage
CLERK_SECRET_KEY=sk_test_your_test_key
REDIS_URL=redis://stage-redis:6379
LOG_LEVEL=info
```

### Production Environment

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://prod_user:prod_pass@prod-db:5432/gloria_prod
CLERK_SECRET_KEY=sk_live_your_production_key
REDIS_URL=redis://prod-redis:6379
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=warn
```

## Configuration Categories

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Server port |
| `API_PREFIX` | `api` | API path prefix |
| `API_VERSION` | `v1` | API version |

### Database Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |

### Authentication (Clerk)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for authentication |
| `CLERK_WEBHOOK_SECRET` | No | Webhook signing secret |

### Email Service (Postmark)

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTMARK_API_KEY` | No | Postmark API key |
| `POSTMARK_FROM_EMAIL` | No | Default from email |

### Caching (Redis)

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis connection URL |
| `REDIS_PASSWORD` | No | Redis password |

### Security

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | No | JWT secret (min 32 chars) |
| `ENCRYPTION_KEY` | No | Encryption key (min 32 chars) |
| `SESSION_SECRET` | No | Session secret (min 32 chars) |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### File Upload

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `./uploads` | Upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max file size (bytes) |

### Monitoring

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Sentry error tracking |
| `LOG_LEVEL` | `info` | Log level |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SWAGGER` | `true` | Enable Swagger docs |
| `ENABLE_METRICS` | `true` | Enable metrics endpoint |
| `ENABLE_HEALTH_CHECK` | `true` | Enable health checks |
| `ENABLE_AUDIT_LOG` | `true` | Enable audit logging |

## Configuration Management Endpoints

### Backend Endpoints

```bash
# Check configuration health
GET /api/v1/config/health

# Get required configuration keys
GET /api/v1/config/required

# Get missing configuration keys
GET /api/v1/config/missing

# Export sanitized configuration (admin only)
GET /api/v1/config/export
```

### Frontend Configuration Page

Access the configuration management UI at:
```
/admin/config
```

This page shows:
- Configuration health status
- Missing required variables
- Configuration warnings
- Sanitized current configuration

## Best Practices

### Security

1. **Never commit secrets**: Use `.env.local` files which are gitignored
2. **Use production keys in production**: Always use `pk_live_*` and `sk_live_*` keys
3. **Generate strong secrets**: Use `openssl rand -base64 32` for secrets
4. **Mask sensitive values**: The system automatically masks sensitive values in logs

### Environment Variables

1. **Use descriptive names**: Follow the naming convention `CATEGORY_SUBCATEGORY_PROPERTY`
2. **Provide defaults**: Set reasonable defaults for non-critical configuration
3. **Document all variables**: Keep `.env.example` files up to date
4. **Validate early**: Configuration is validated on application startup

### Production Deployment

1. **Set all required variables**: Ensure all required configuration is set
2. **Enable monitoring**: Configure Sentry for error tracking
3. **Use Redis for caching**: Improves performance in production
4. **Secure your secrets**: Use secret management systems (AWS Secrets Manager, etc.)

## Troubleshooting

### Common Issues

#### Missing Required Configuration

**Error**: `Configuration validation failed: DATABASE_URL is required`

**Solution**: Ensure all required environment variables are set in your `.env` file

#### Invalid Configuration Values

**Error**: `CLERK_SECRET_KEY must match pattern /^sk_(test|live)_/`

**Solution**: Use valid Clerk keys starting with `sk_test_` or `sk_live_`

#### Redis Connection Failed

**Error**: `Redis connection failed`

**Solution**: Redis is optional. Either fix the connection or remove `REDIS_URL`

### Debugging Configuration

1. Check current configuration:
```bash
# Backend
curl http://localhost:3001/api/v1/config/health

# Frontend (in browser console)
import { getConfigHealth } from '@/lib/config/config-validation';
console.log(getConfigHealth());
```

2. View missing configuration:
```bash
curl http://localhost:3001/api/v1/config/missing
```

3. Export sanitized configuration (admin only):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/config/export
```

## Migration Guide

### From Hardcoded to Environment Variables

If migrating from hardcoded values:

1. Identify all hardcoded configuration
2. Add variables to `.env.example`
3. Update code to use `configService.get()`
4. Test in all environments
5. Document new variables

### Upgrading Configuration Schema

When adding new configuration:

1. Add to validation schema (`config-validation.service.ts`)
2. Update `.env.example` files
3. Document in this guide
4. Notify team of new requirements

## Support

For configuration issues:

1. Check this documentation
2. Review validation errors in logs
3. Use `/admin/config` page for diagnostics
4. Contact DevOps team for production issues