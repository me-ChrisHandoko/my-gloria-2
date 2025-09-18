# Environment Configuration & Security Best Practices

## 🔐 Security Guidelines

### 1. Secret Management

#### Generate Strong Secrets
```bash
# Generate a secure JWT secret (32 bytes)
openssl rand -hex 32

# Generate a secure encryption key (exactly 32 characters)
openssl rand -base64 24 | cut -c1-32

# Generate a UUID for API keys
uuidgen | tr '[:upper:]' '[:lower:]'
```

#### Never Commit Secrets
```bash
# Add to .gitignore
.env
.env.*
!.env.example
!.env.*.example

# Check for accidentally committed secrets
git ls-files | xargs grep -E "(sk_|pk_|whsec_|api_key|password|secret)"
```

### 2. Environment-Specific Configuration

#### File Structure
```
.env.example          # Template with dummy values (commit this)
.env.development      # Development settings (don't commit)
.env.staging         # Staging settings (don't commit)
.env.production      # Production settings (never commit)
.env                 # Active configuration (never commit)
```

#### Loading Priority
```javascript
// Load environment-specific configuration
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
require('dotenv').config({ path: envFile });
```

### 3. Production Security Checklist

#### Required Security Settings
- [ ] Strong JWT_SECRET (minimum 32 characters)
- [ ] Unique ENCRYPTION_KEY (exactly 32 characters)
- [ ] HTTPS only in production (enforce SSL)
- [ ] Secure session configuration
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS protection (Helmet configured)
- [ ] CSRF protection for state-changing operations

#### Database Security
```bash
# Production database URL should use SSL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Use connection pooling
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_QUERY_TIMEOUT=10000
```

#### Authentication Security
```bash
# Clerk configuration
CLERK_SECRET_KEY=sk_live_xxxxx      # Use live keys in production
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx # Never use test keys in production
CLERK_WEBHOOK_SECRET=whsec_xxxxx    # Verify webhook signatures

# Session configuration
SESSION_TTL=3600                    # 1 hour session timeout
SESSION_SECURE=true                 # HTTPS only cookies
SESSION_SAME_SITE=strict           # CSRF protection
```

### 4. Environment Variable Validation

#### Pre-startup Validation
```javascript
// Add to src/main.ts before app.listen()
import { validateEnvironment } from '../scripts/validate-env';

async function bootstrap() {
  // Validate environment before starting
  if (process.env.NODE_ENV === 'production') {
    validateEnvironment();
  }
  
  // ... rest of bootstrap
}
```

#### Runtime Validation
```bash
# Run validation before deployment
npm run env:validate

# Add to CI/CD pipeline
- name: Validate Environment
  run: npm run env:validate
```

### 5. Secrets Rotation Strategy

#### Regular Rotation Schedule
- **JWT_SECRET**: Every 90 days
- **ENCRYPTION_KEY**: Every 180 days
- **API Keys**: Every 60 days
- **Database passwords**: Every 90 days
- **Webhook secrets**: When compromised

#### Rotation Process
1. Generate new secret
2. Update staging environment
3. Test thoroughly
4. Update production during maintenance window
5. Monitor for issues
6. Remove old secret after grace period

### 6. Development vs Production

#### Development Settings
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
PRETTY_LOGS=true
SWAGGER_ENABLED=true
MOCK_EXTERNAL_SERVICES=true
RATE_LIMIT_MAX=1000
```

#### Production Settings
```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=error
PRETTY_LOGS=false
SWAGGER_ENABLED=false
MOCK_EXTERNAL_SERVICES=false
RATE_LIMIT_MAX=100
```

### 7. Monitoring & Auditing

#### Environment Variable Access Logging
```typescript
// Log access to sensitive variables
const getSensitiveVar = (key: string): string => {
  const value = process.env[key];
  logger.audit(`Accessed sensitive variable: ${key}`);
  return value;
};
```

#### Security Headers
```typescript
// Configure Helmet for production
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

### 8. Emergency Response

#### Compromised Secrets Response
1. **Immediate Actions**:
   - Rotate compromised secrets immediately
   - Audit recent access logs
   - Check for unauthorized access
   - Update all environments

2. **Investigation**:
   - Review commit history
   - Check CI/CD logs
   - Audit team member access
   - Review security alerts

3. **Prevention**:
   - Enable secret scanning in GitHub
   - Use environment variable managers
   - Implement least privilege access
   - Regular security audits

### 9. Tools & Services

#### Secret Management Tools
- **HashiCorp Vault**: Enterprise secret management
- **AWS Secrets Manager**: AWS integrated solution
- **Azure Key Vault**: Azure integrated solution
- **Doppler**: Developer-friendly secret management
- **1Password Secrets**: Team secret sharing

#### Environment Variable Services
- **dotenv-vault**: Encrypted .env sync
- **Infisical**: Open-source secret management
- **Akeyless**: Cloud-native secrets management

### 10. CI/CD Integration

#### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Validate Environment
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          npm run env:validate
          
      - name: Deploy
        if: success()
        run: |
          # Deployment steps
```

#### Secrets in CI/CD
- Store secrets in CI/CD secret management
- Never echo secrets in logs
- Use masked variables
- Rotate CI/CD secrets regularly
- Audit secret access

## 🚨 Common Mistakes to Avoid

1. **Hardcoding secrets in code**
   ```typescript
   // ❌ NEVER DO THIS
   const apiKey = "sk_live_abc123";
   
   // ✅ DO THIS
   const apiKey = process.env.API_KEY;
   ```

2. **Committing .env files**
   ```bash
   # ❌ NEVER commit these
   git add .env
   git add .env.production
   
   # ✅ Only commit templates
   git add .env.example
   ```

3. **Using same secrets across environments**
   ```bash
   # ❌ NEVER reuse production secrets
   # .env.development
   JWT_SECRET=same-as-production
   
   # ✅ Use different secrets per environment
   # .env.development
   JWT_SECRET=dev-only-secret-not-for-prod
   ```

4. **Logging sensitive data**
   ```typescript
   // ❌ NEVER log secrets
   console.log('Database URL:', process.env.DATABASE_URL);
   
   // ✅ Log safely
   console.log('Database connected:', !!process.env.DATABASE_URL);
   ```

5. **Weak secret generation**
   ```bash
   # ❌ NEVER use weak secrets
   JWT_SECRET=mysecret123
   
   # ✅ Use cryptographically secure secrets
   JWT_SECRET=$(openssl rand -hex 32)
   ```

## 📋 Quick Reference

### Environment Setup Commands
```bash
# Initial setup
npm run env:setup

# Validate configuration
npm run env:validate

# Generate secrets
openssl rand -hex 32

# Check for exposed secrets
git secrets --scan
```

### Required Environment Variables
- `NODE_ENV` - Application environment
- `PORT` - Server port
- `DATABASE_URL` - PostgreSQL connection
- `CLERK_SECRET_KEY` - Authentication
- `JWT_SECRET` - Token signing
- `ENCRYPTION_KEY` - Data encryption

### Security Headers Checklist
- [x] Content Security Policy
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] Strict-Transport-Security
- [x] X-XSS-Protection
- [x] Referrer-Policy

---

*Remember: Security is not a feature, it's a requirement. Always prioritize security over convenience.*