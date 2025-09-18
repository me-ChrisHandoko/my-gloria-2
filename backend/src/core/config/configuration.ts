import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: 'api',
  apiVersion: 'v1',
  globalPrefix: `api/v1`,
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
}));

export const authConfig = registerAs('auth', () => ({
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  jwtSecret: process.env.JWT_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10),
  sessionExtendOnActivity: process.env.SESSION_EXTEND_ON_ACTIVITY === 'true',
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
  cacheTtl: parseInt(process.env.CACHE_TTL || '3600', 10),
  enabled: !!process.env.REDIS_URL,
}));

export const emailConfig = registerAs('email', () => ({
  postmarkApiKey: process.env.POSTMARK_API_KEY,
  fromEmail: process.env.POSTMARK_FROM_EMAIL || 'noreply@gloria.local',
  enabled: !!process.env.POSTMARK_API_KEY,
}));

export const corsConfig = registerAs('cors', () => ({
  origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));

export const rateLimitConfig = registerAs('rateLimit', () => ({
  ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
}));

export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.PRETTY_LOGS === 'true',
  enableDebug: process.env.ENABLE_DEBUG_MODE === 'true',
}));

export const swaggerConfig = registerAs('swagger', () => ({
  enabled:
    process.env.SWAGGER_ENABLED !== 'false' &&
    process.env.NODE_ENV !== 'production',
  title: 'Gloria API',
  description: 'Gloria Backend API Documentation',
  version: '1.0',
  path: 'api/docs',
}));

export const monitoringConfig = registerAs('monitoring', () => ({
  sentryDsn: process.env.SENTRY_DSN,
  apmEnabled: process.env.APM_ENABLED === 'true',
  enabled: !!process.env.SENTRY_DSN,
}));

export const fileUploadConfig = registerAs('fileUpload', () => ({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  allowedMimeTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],
}));

export const configuration = () => ({
  app: appConfig(),
  database: databaseConfig(),
  auth: authConfig(),
  redis: redisConfig(),
  email: emailConfig(),
  cors: corsConfig(),
  rateLimit: rateLimitConfig(),
  logging: loggingConfig(),
  swagger: swaggerConfig(),
  monitoring: monitoringConfig(),
  fileUpload: fileUploadConfig(),
});
