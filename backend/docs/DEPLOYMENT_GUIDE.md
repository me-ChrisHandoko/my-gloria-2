# Gloria Backend Deployment Guide

## Table of Contents
1. [Deployment Overview](#deployment-overview)
2. [Environment Preparation](#environment-preparation)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Deployments](#cloud-deployments)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Observability](#monitoring--observability)
8. [Backup & Recovery](#backup--recovery)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

## Deployment Overview

### Architecture Components
- **Application**: NestJS backend with Fastify
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Queue**: Bull with Redis backend
- **File Storage**: S3-compatible storage (optional)
- **Email Service**: Postmark
- **Authentication**: Clerk

### Deployment Strategies
1. **Docker Compose**: Development and small deployments
2. **Kubernetes**: Production and scalable deployments
3. **Cloud PaaS**: AWS ECS, Google Cloud Run, Azure Container Instances
4. **Traditional VPS**: PM2 on Linux servers

## Environment Preparation

### 1. System Requirements

#### Minimum Requirements (Development)
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 100 Mbps

#### Recommended Requirements (Production)
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- Network: 1 Gbps
- Load Balancer: Yes
- CDN: Recommended

### 2. Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_NAME=Gloria Backend
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://user:password@host:5432/gloria_prod?schema=gloria_ops
DATABASE_POOL_SIZE=20

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_live_xxx
CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_JWT_KEY=your-jwt-verification-key

# Email (Postmark)
POSTMARK_API_KEY=your-postmark-key
POSTMARK_FROM_EMAIL=noreply@gloria.com

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
API_KEY_SALT=your-api-key-salt

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEW_RELIC_LICENSE_KEY=xxx

# Feature Flags
ENABLE_SWAGGER=false
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
```

### 3. SSL Certificates

#### Using Let's Encrypt
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.gloria.com

# Auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production
RUN npm install -g @nestjs/cli prisma

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: gloria-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - gloria-network
    volumes:
      - ./logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  postgres:
    image: postgres:15-alpine
    container_name: gloria-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: gloria_prod
      POSTGRES_USER: gloria
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - gloria-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  redis:
    image: redis:7-alpine
    container_name: gloria-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
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
    container_name: gloria-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
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

### 3. Nginx Configuration

```nginx
upstream gloria_backend {
    server app:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.gloria.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.gloria.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://gloria_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        proxy_pass http://gloria_backend/health;
    }
}
```

## Kubernetes Deployment

### 1. Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gloria-backend
  namespace: gloria
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gloria-backend
  template:
    metadata:
      labels:
        app: gloria-backend
    spec:
      containers:
      - name: app
        image: gloria/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - configMapRef:
            name: gloria-config
        - secretRef:
            name: gloria-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### 2. Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gloria-backend-service
  namespace: gloria
spec:
  selector:
    app: gloria-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gloria-backend-ingress
  namespace: gloria
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.gloria.com
    secretName: gloria-tls
  rules:
  - host: api.gloria.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gloria-backend-service
            port:
              number: 80
```

### 3. Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gloria-backend-hpa
  namespace: gloria
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gloria-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cloud Deployments

### AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker build -t gloria-backend .
docker tag gloria-backend:latest $ECR_URI/gloria-backend:latest
docker push $ECR_URI/gloria-backend:latest

# Deploy with ECS CLI
ecs-cli compose --file docker-compose.yml up --cluster gloria-cluster
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/gloria-backend
gcloud run deploy gloria-backend \
  --image gcr.io/PROJECT-ID/gloria-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Azure Container Instances

```bash
# Create resource group
az group create --name gloria-rg --location eastus

# Create container
az container create \
  --resource-group gloria-rg \
  --name gloria-backend \
  --image gloria/backend:latest \
  --dns-name-label gloria-api \
  --ports 3000 \
  --environment-variables NODE_ENV=production
```

## CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t gloria-backend:${{ github.sha }} .
          docker tag gloria-backend:${{ github.sha }} gloria-backend:latest

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push gloria-backend:${{ github.sha }}
          docker push gloria-backend:latest

      - name: Deploy to production
        run: |
          ssh ${{ secrets.PROD_SERVER }} "
            docker pull gloria-backend:latest &&
            docker-compose down &&
            docker-compose up -d
          "

      - name: Run database migrations
        run: |
          ssh ${{ secrets.PROD_SERVER }} "
            docker exec gloria-backend npx prisma migrate deploy
          "

      - name: Health check
        run: |
          sleep 30
          curl -f https://api.gloria.com/health || exit 1
```

## Monitoring & Observability

### 1. Application Monitoring

#### Prometheus Metrics
```typescript
// metrics.controller.ts
@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics(): string {
    return register.metrics();
  }
}
```

#### Grafana Dashboard
Import dashboard JSON from `monitoring/grafana-dashboard.json`

### 2. Log Aggregation

#### ELK Stack Configuration
```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
    - add_docker_metadata:
        host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### 3. APM Setup

#### New Relic
```typescript
// main.ts
import * as newrelic from 'newrelic';

async function bootstrap() {
  newrelic.instrumentLoadedModule('fastify', fastify);
  // ... rest of bootstrap
}
```

#### Sentry
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## Backup & Recovery

### 1. Database Backup

#### Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="gloria_prod"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://gloria-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

#### Cron Schedule
```bash
# Run backup daily at 2 AM
0 2 * * * /scripts/backup.sh
```

### 2. Disaster Recovery

#### Recovery Procedure
1. **Database Recovery**
```bash
# Download latest backup
aws s3 cp s3://gloria-backups/latest.sql.gz .

# Decompress
gunzip latest.sql.gz

# Restore
psql $DATABASE_URL < latest.sql
```

2. **Application Recovery**
```bash
# Pull latest image
docker pull gloria-backend:stable

# Start services
docker-compose up -d

# Verify health
curl https://api.gloria.com/health
```

## Security Hardening

### 1. Network Security
- Use VPC/Private networks
- Configure security groups/firewall rules
- Enable DDoS protection
- Use WAF for application protection

### 2. Container Security
```dockerfile
# Run security scan
docker scan gloria-backend:latest

# Use minimal base images
FROM node:20-alpine

# Run as non-root user
USER nodejs

# Read-only filesystem
docker run --read-only gloria-backend
```

### 3. Secrets Management
```bash
# Use secret management services
# AWS Secrets Manager
aws secretsmanager create-secret --name gloria-prod-secrets

# Kubernetes Secrets
kubectl create secret generic gloria-secrets --from-env-file=.env.production

# HashiCorp Vault
vault kv put secret/gloria database_url=postgresql://...
```

### 4. Security Checklist
- [ ] SSL/TLS certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Dependency scanning
- [ ] Container scanning
- [ ] Regular security updates

## Troubleshooting

### Common Deployment Issues

#### 1. Database Connection Failed
```bash
# Check connectivity
nc -zv postgres-host 5432

# Check credentials
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

#### 2. Redis Connection Issues
```bash
# Test connection
redis-cli -h redis-host ping

# Check memory
redis-cli info memory

# Clear cache if needed
redis-cli FLUSHDB
```

#### 3. High Memory Usage
```bash
# Check container memory
docker stats gloria-backend

# Analyze heap dump
node --inspect dist/main.js
chrome://inspect

# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node dist/main.js
```

#### 4. Slow Response Times
```bash
# Check database queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC;

# Enable query logging
DEBUG=prisma:query npm start

# Profile application
node --prof dist/main.js
node --prof-process isolate-*.log
```

### Health Check Endpoints

```bash
# Overall health
curl https://api.gloria.com/health

# Liveness check
curl https://api.gloria.com/health/live

# Readiness check
curl https://api.gloria.com/health/ready

# Detailed metrics
curl https://api.gloria.com/metrics
```

### Rollback Procedure

```bash
# 1. Identify last working version
docker images gloria-backend

# 2. Stop current deployment
docker-compose stop

# 3. Deploy previous version
docker-compose up -d gloria-backend:previous-tag

# 4. Verify health
curl https://api.gloria.com/health

# 5. Rollback database if needed
psql $DATABASE_URL < rollback.sql
```

## Performance Tuning

### 1. Application Tuning
```javascript
// PM2 configuration
module.exports = {
  apps: [{
    name: 'gloria-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  }]
};
```

### 2. Database Tuning
```sql
-- PostgreSQL configuration
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET random_page_cost = 1.1;
```

### 3. Redis Tuning
```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Verify backup completion

#### Weekly
- [ ] Review security alerts
- [ ] Check disk usage
- [ ] Update dependencies (security patches)
- [ ] Test backup restoration

#### Monthly
- [ ] Performance analysis
- [ ] Security audit
- [ ] Database optimization
- [ ] Update documentation

### Update Procedure

```bash
# 1. Backup current state
./scripts/backup.sh

# 2. Test in staging
docker-compose -f docker-compose.staging.yml up

# 3. Deploy to production
docker-compose pull
docker-compose up -d --no-deps gloria-backend

# 4. Run migrations
docker exec gloria-backend npx prisma migrate deploy

# 5. Verify deployment
curl https://api.gloria.com/health
```

## Support

For deployment support:
- Documentation: This guide
- Issues: GitHub Issues
- Emergency: On-call engineer via PagerDuty
- Slack: #gloria-ops channel