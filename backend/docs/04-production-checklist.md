# Gloria Backend Production Checklist & Deployment Guide

## 🚀 Production Readiness Checklist

### ✅ 1. Security Checklist

#### Authentication & Authorization

- [ ] Clerk integration fully configured
- [ ] JWT token validation implemented
- [ ] Token expiration and refresh mechanism
- [ ] Session management with timeout
- [ ] Multi-factor authentication enabled (if required)

#### API Security

- [ ] Rate limiting configured on all endpoints
- [ ] CORS properly configured for production domains
- [ ] Helmet.js security headers enabled
- [ ] API key management for external services
- [ ] Request size limits configured
- [ ] SQL injection protection (via Prisma)
- [ ] XSS protection enabled
- [ ] CSRF protection implemented

#### Data Security

- [ ] Sensitive data encryption at rest
- [ ] Environment variables secured
- [ ] Database connection SSL enabled
- [ ] Secrets management system configured
- [ ] PII data handling compliance
- [ ] Data retention policies implemented
- [ ] Backup encryption enabled

#### Access Control

- [ ] Permission system fully tested
- [ ] Role-based access control verified
- [ ] Resource-level permissions working
- [ ] Audit logging for sensitive operations
- [ ] Admin access restrictions

### ✅ 2. Performance Checklist

#### Application Performance

- [ ] Response time <200ms for 95% requests
- [ ] Database queries optimized
- [ ] N+1 query problems resolved
- [ ] Proper indexing on all foreign keys
- [ ] Pagination implemented on all list endpoints
- [ ] Lazy loading for large datasets
- [ ] Connection pooling configured

#### Caching Strategy

- [ ] Redis configured for production
- [ ] Permission calculations cached
- [ ] Frequently accessed data cached
- [ ] Cache invalidation strategy implemented
- [ ] TTL values properly configured
- [ ] Cache warm-up on startup

#### Resource Optimization

- [ ] Memory usage profiled and optimized
- [ ] CPU usage within acceptable limits
- [ ] File upload size limits configured
- [ ] Image optimization for uploads
- [ ] Gzip compression enabled
- [ ] CDN configured for static assets

### ✅ 3. Database Checklist

#### Schema & Migrations

- [ ] All migrations tested and versioned
- [ ] Rollback procedures documented
- [ ] Database schema optimized
- [ ] Indexes on frequently queried columns
- [ ] Foreign key constraints validated
- [ ] Data integrity rules enforced

#### Database Operations

- [ ] Connection pooling configured
- [ ] Read replicas configured (if needed)
- [ ] Database backup strategy implemented
- [ ] Point-in-time recovery tested
- [ ] Database monitoring enabled
- [ ] Slow query logging enabled

#### Data Management

- [ ] Seed data prepared for production
- [ ] Data migration scripts tested
- [ ] Soft delete implementation verified
- [ ] Archive strategy for old data
- [ ] GDPR compliance (right to be forgotten)

### ✅ 4. Testing Checklist

#### Test Coverage

- [ ] Unit test coverage >80%
- [ ] Integration tests for critical paths
- [ ] E2E tests for user workflows
- [ ] API endpoint tests complete
- [ ] Permission system tests comprehensive
- [ ] Workflow engine tests complete

#### Test Types

- [ ] Load testing completed
- [ ] Stress testing performed
- [ ] Security testing (penetration testing)
- [ ] Performance benchmarks met
- [ ] Failover testing successful
- [ ] Recovery testing validated

### ✅ 5. Monitoring & Logging

#### Application Monitoring

- [ ] APM tool configured (New Relic/DataDog)
- [ ] Error tracking with Sentry
- [ ] Custom metrics dashboard created
- [ ] Health check endpoints working
- [ ] Uptime monitoring configured
- [ ] Performance metrics tracked

#### Logging Strategy

- [ ] Centralized logging configured
- [ ] Log levels properly set for production
- [ ] Correlation IDs implemented
- [ ] Sensitive data excluded from logs
- [ ] Log rotation configured
- [ ] Log retention policy defined

#### Alerting

- [ ] Critical error alerts configured
- [ ] Performance degradation alerts
- [ ] Security incident alerts
- [ ] Database issue alerts
- [ ] Resource utilization alerts
- [ ] Business metric alerts

### ✅ 6. Documentation Checklist

#### Technical Documentation

- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Database schema documented
- [ ] Architecture diagrams updated
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide created
- [ ] Recovery procedures documented

#### Operational Documentation

- [ ] Runbook for common issues
- [ ] Incident response procedures
- [ ] Escalation matrix defined
- [ ] Maintenance procedures documented
- [ ] Backup/restore procedures
- [ ] Disaster recovery plan

### ✅ 7. Infrastructure Checklist

#### Environment Setup

- [ ] Production environment isolated
- [ ] Staging environment mirrors production
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Domain configuration complete
- [ ] Load balancer configured

#### High Availability

- [ ] Multiple server instances configured
- [ ] Auto-scaling policies defined
- [ ] Health checks configured
- [ ] Graceful shutdown implemented
- [ ] Zero-downtime deployment ready
- [ ] Failover mechanism tested

## 🏗️ Infrastructure Setup

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://postgres:mydevelopment@host:3479/new_gloria_db"

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Redis Cache
REDIS_URL=redis://user:password@redis-host:6379
REDIS_TLS=true

# Postmark Email
POSTMARK_API_KEY=xxxxx
POSTMARK_FROM_EMAIL=noreply@gloria.org

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEW_RELIC_LICENSE_KEY=xxxxx

# Security
JWT_SECRET=xxxxx
ENCRYPTION_KEY=xxxxx
API_RATE_LIMIT=100

# Storage
AWS_S3_BUCKET=gloria-prod
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

# Build application
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: gloria-backend:latest
    restart: always
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - gloria-network
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: gloria_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks:
      - gloria-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - gloria-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - gloria-network

volumes:
  postgres-data:
  redis-data:

networks:
  gloria-network:
    driver: bridge
```

## 📦 Deployment Process

### 1. Pre-Deployment Steps

```bash
# 1. Run tests
npm run test
npm run test:e2e

# 2. Build application
npm run build

# 3. Run security audit
npm audit
npm audit fix

# 4. Check for vulnerabilities
npm run security:check

# 5. Validate environment variables
npm run validate:env

# 6. Database migrations dry-run
npx prisma migrate deploy --dry-run
```

### 2. Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Variables
ENVIRONMENT=$1
VERSION=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./deploy.sh <environment> <version>"
  exit 1
fi

# Backup current version
echo "📦 Backing up current version..."
./scripts/backup.sh

# Pull latest code
echo "📥 Pulling latest code..."
git fetch --all
git checkout tags/$VERSION

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build application
echo "🔨 Building application..."
npm run build

# Run health check
echo "🏥 Running health check..."
npm run health:check

# Start new version
echo "🚀 Starting new version..."
pm2 reload ecosystem.config.js --env $ENVIRONMENT

# Verify deployment
echo "✅ Verifying deployment..."
./scripts/verify-deployment.sh

echo "✨ Deployment complete!"
```

### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gloria-backend',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      kill_timeout: 5000,
      wait_ready: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
  ],
};
```

### 4. Nginx Configuration

```nginx
# nginx.conf
upstream gloria_backend {
    least_conn;
    server app1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.gloria.org;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location /api/v1 {
        proxy_pass http://gloria_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://gloria_backend/health;
        access_log off;
    }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: |
          npm run test
          npm run test:e2e

      - name: Run security audit
        run: npm audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t gloria-backend:${{ github.ref_name }} .
          docker tag gloria-backend:${{ github.ref_name }} gloria-backend:latest

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push gloria-backend:${{ github.ref_name }}
          docker push gloria-backend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app/gloria-backend
            ./deploy.sh production ${{ github.ref_name }}
```

## 🔥 Rollback Procedure

### Immediate Rollback

```bash
#!/bin/bash
# rollback.sh

# Get previous version
PREVIOUS_VERSION=$(cat .last-deployed-version)

echo "🔄 Rolling back to version $PREVIOUS_VERSION..."

# Stop current version
pm2 stop gloria-backend

# Checkout previous version
git checkout tags/$PREVIOUS_VERSION

# Rebuild
npm ci --only=production
npm run build

# Rollback database if needed
npx prisma migrate resolve --rolled-back

# Start previous version
pm2 start ecosystem.config.js --env production

echo "✅ Rollback complete!"
```

## 📊 Post-Deployment Verification

### Health Check Script

```typescript
// scripts/health-check.ts
import axios from 'axios';

const healthChecks = [
  { name: 'API Health', url: '/health' },
  { name: 'Database', url: '/health/database' },
  { name: 'Redis', url: '/health/redis' },
  { name: 'Auth Service', url: '/health/auth' },
];

async function verifyDeployment() {
  const baseURL = process.env.API_URL || 'http://localhost:3000';

  for (const check of healthChecks) {
    try {
      const response = await axios.get(`${baseURL}${check.url}`);
      if (response.status === 200) {
        console.log(`✅ ${check.name}: OK`);
      } else {
        console.error(`❌ ${check.name}: Failed`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ ${check.name}: Error - ${error.message}`);
      process.exit(1);
    }
  }

  console.log('🎉 All health checks passed!');
}

verifyDeployment();
```

## 🆘 Disaster Recovery

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash

# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://gloria-backups/

# Keep last 30 days
find ./backups -name "backup-*.sql" -mtime +30 -delete
```

### Recovery Procedure

1. **Identify Issue**: Determine scope and impact
2. **Isolate Problem**: Prevent further damage
3. **Restore Service**: Use backup or rollback
4. **Verify Recovery**: Run health checks
5. **Post-Mortem**: Document and learn

---

_This checklist ensures the Gloria backend is production-ready, secure, performant, and maintainable._
