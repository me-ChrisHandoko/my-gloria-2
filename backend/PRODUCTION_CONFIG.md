# Production Configuration Guide

## 🚀 Production Deployment Checklist

### ✅ Fixed Issues
1. **TypeScript Compilation Errors**: Fixed type compatibility issues in cleanup scripts
2. **Monitoring Module Integration**: Properly integrated SecurityMonitorService with existing monitoring
3. **Security Validation**: Added DataKaryawan validation to prevent unauthorized access
4. **Audit Logging**: Comprehensive security event tracking

### 🔐 Security Configuration

#### Environment Variables (Required)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/gloria_db?schema=public

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Redis Cache
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS_ENABLED=true

# Email Service (Postmark)
POSTMARK_API_KEY=your-postmark-api-key
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# Security
JWT_SECRET=your-strong-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key

# Monitoring
SECURITY_NOTIFICATION_CHANNELS=email,slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Performance
NODE_ENV=production
LOG_LEVEL=error
```

### 🏥 Health Checks

The application provides comprehensive health endpoints:

- **Main Health**: `GET /health` - Overall system health
- **Liveness**: `GET /health/live` - Process is alive
- **Readiness**: `GET /health/ready` - Ready to accept traffic
- **Metrics**: `GET /health/metrics` - Prometheus metrics
- **Security Stats**: `GET /monitoring/security/stats` - Security monitoring dashboard

### 🛡️ Security Features

#### 1. DataKaryawan Validation
- All users must exist in DataKaryawan with `statusAktif = 'Aktif'`
- Validation occurs at:
  - Login (`/auth/login`)
  - Every authenticated request
  - User sync operations

#### 2. Security Monitoring
- Failed login tracking with threshold alerts
- Unauthorized access monitoring
- Real-time threat level assessment
- Security audit logs for compliance

#### 3. Rate Limiting
- Global rate limit: 100 requests per minute
- Authentication endpoints: 5 requests per minute
- Configurable per endpoint

### 📊 Monitoring & Observability

#### Prometheus Metrics
Available at `/metrics` endpoint:
- Request duration
- Response status codes
- Database query performance
- Cache hit rates
- Memory usage
- Garbage collection metrics

#### Security Monitoring
- Failed login attempts tracking
- Unauthorized access patterns
- Top security offenders
- Threat level indicators

#### Audit Logs
All security events are logged with:
- Actor identification
- Action performed
- Timestamp
- IP address
- User agent
- Detailed metadata

### 🚀 Deployment Steps

1. **Database Setup**
```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

2. **Build Application**
```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build
```

3. **Start Application**
```bash
# Production mode
NODE_ENV=production npm run start:prod
```

### 🧹 Maintenance Scripts

#### Clean Invalid User Profiles
```bash
# Dry run (audit only)
npm run cleanup:profiles:dry

# Execute cleanup
npm run cleanup:profiles
```

### ⚡ Performance Optimization

1. **Database**
   - Connection pooling configured (min: 2, max: 10)
   - Query optimization with proper indexing
   - Lazy loading for relations

2. **Caching**
   - Redis caching for frequently accessed data
   - TTL configuration per cache type
   - Cache invalidation strategies

3. **Memory Management**
   - Regular garbage collection monitoring
   - Memory leak detection
   - Resource cleanup on shutdown

### 🔍 Troubleshooting

#### Common Issues

1. **Server Won't Start**
   - Check DATABASE_URL is correct
   - Verify Redis connection
   - Ensure CLERK_SECRET_KEY is set

2. **Authentication Failures**
   - Verify user exists in DataKaryawan
   - Check employee status is 'Aktif'
   - Review audit logs for details

3. **High Memory Usage**
   - Monitor `/health/metrics`
   - Check for memory leaks
   - Review connection pools

### 📋 Environment-Specific Settings

#### Production
```javascript
{
  NODE_ENV: 'production',
  LOG_LEVEL: 'error',
  CORS_ORIGIN: 'https://yourdomain.com',
  RATE_LIMIT_MAX: 100,
  CACHE_TTL: 3600
}
```

#### Staging
```javascript
{
  NODE_ENV: 'staging',
  LOG_LEVEL: 'warn',
  CORS_ORIGIN: 'https://staging.yourdomain.com',
  RATE_LIMIT_MAX: 200,
  CACHE_TTL: 1800
}
```

### 📈 Monitoring Dashboard

Access security statistics:
```
GET /monitoring/security/stats?hours=24
```

Response includes:
- Failed login count
- Unauthorized access attempts
- Current threat level
- Top offending IPs/emails
- Recent security alerts

### ✅ Pre-Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Redis connection verified
- [ ] Clerk authentication configured
- [ ] Email service (Postmark) configured
- [ ] Security notification channels setup
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] CORS settings updated
- [ ] Logging level set appropriately
- [ ] Health checks passing
- [ ] Security monitoring active
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Load testing completed

### 🆘 Support & Monitoring

- **Logs**: Check application logs for detailed error information
- **Metrics**: Monitor Prometheus metrics for performance insights
- **Alerts**: Configure alerts for critical thresholds
- **Documentation**: Keep this guide updated with new configurations

### 📝 Version Information

- **Node.js**: 20.x LTS recommended
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **NestJS**: 11.x
- **Prisma**: 6.x

---

Last Updated: September 2025