/**
 * Authentication Types and Interfaces
 * Production-ready type definitions for the authentication system
 */

import { Request } from 'express';
import { FastifyRequest } from 'fastify';

/**
 * Represents an authenticated user in the system
 */
export interface AuthenticatedUser {
  /** Unique user identifier from the database */
  id: string;

  /** Clerk user ID for external authentication */
  clerkUserId: string;

  /** User's email address */
  email?: string;

  /** User's first name */
  firstName?: string;

  /** User's last name */
  lastName?: string;

  /** Employee ID (NIP - Nomor Induk Pegawai) */
  nip?: string;

  /** User's avatar URL */
  avatarUrl?: string;

  /** Indicates if the user account is active */
  isActive: boolean;

  /** User's roles in the system */
  roles?: UserRole[];

  /** User's permissions (computed from roles and direct assignments) */
  permissions?: UserPermission[];

  /** User's positions in the organizational hierarchy */
  positions?: UserPosition[];

  /** Current session information */
  session?: SessionInfo;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * User role information
 */
export interface UserRole {
  id: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  assignedAt: Date;
  expiresAt?: Date;
  assignedBy?: string;
}

/**
 * User permission information
 */
export interface UserPermission {
  resource: string;
  action: string;
  scope: string;
  granted: boolean;
  conditions?: Record<string, any>;
}

/**
 * User position in organizational hierarchy
 */
export interface UserPosition {
  id: string;
  positionId: string;
  positionName: string;
  departmentId: string;
  departmentName: string;
  schoolId: string;
  schoolName: string;
  isPrimary: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * Session information for the authenticated user
 */
export interface SessionInfo {
  /** Session ID */
  sessionId: string;

  /** Client IP address */
  ipAddress?: string;

  /** User agent string */
  userAgent?: string;

  /** Session creation timestamp */
  createdAt: Date;

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** Session expiration timestamp */
  expiresAt: Date;

  /** Device information */
  device?: DeviceInfo;
}

/**
 * Device information for session tracking
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;
  platform?: string;
}

/**
 * Extended request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  session?: SessionInfo;
  permissions?: UserPermission[];
}

/**
 * Extended Fastify request interface with authenticated user
 */
export interface AuthenticatedFastifyRequest extends FastifyRequest {
  user: AuthenticatedUser;
  session?: SessionInfo;
  permissions?: UserPermission[];
}

/**
 * API Key authentication information
 */
export interface ApiKeyAuth {
  /** API Key identifier */
  keyId: string;

  /** API Key name/description */
  name: string;

  /** Associated user or service */
  owner: string;

  /** Allowed scopes */
  scopes: string[];

  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;

  /** Key expiration */
  expiresAt?: Date;

  /** Last used timestamp */
  lastUsedAt?: Date;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;

  /** Time window in seconds */
  windowMs: number;

  /** Skip successful requests from counting */
  skipSuccessfulRequests?: boolean;

  /** Skip failed requests from counting */
  skipFailedRequests?: boolean;

  /** Custom key generator */
  keyGenerator?: (req: any) => string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
  code?: string;
  expiresAt?: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: UserPermission[];
  userPermissions?: UserPermission[];
  missingPermissions?: UserPermission[];
}

/**
 * Authentication context for guards and interceptors
 */
export interface AuthContext {
  /** Current user */
  user?: AuthenticatedUser;

  /** Authentication method used */
  authMethod: 'jwt' | 'apikey' | 'session' | 'none';

  /** Authentication token or key */
  token?: string;

  /** Request metadata */
  metadata?: Record<string, any>;

  /** Timestamp of authentication */
  authenticatedAt?: Date;
}

/**
 * Decorator metadata for authentication
 */
export interface AuthDecoratorMetadata {
  /** Indicates if the route is public */
  isPublic?: boolean;

  /** Required roles */
  roles?: string[];

  /** Required permissions */
  permissions?: RequiredPermission[];

  /** API key scopes */
  apiKeyScopes?: string[];

  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;

  /** Skip authentication */
  skipAuth?: boolean;

  /** Custom validation function */
  customValidator?: (user: AuthenticatedUser) => boolean | Promise<boolean>;
}

/**
 * Required permission structure
 */
export interface RequiredPermission {
  /** Resource to access */
  resource: string;

  /** Action to perform */
  action: PermissionAction;

  /** Required scope */
  scope?: PermissionScope;

  /** Additional conditions */
  conditions?: Record<string, any>;
}

/**
 * Permission actions enum
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Permission scopes enum
 */
export enum PermissionScope {
  OWN = 'own',
  TEAM = 'team',
  DEPARTMENT = 'department',
  SCHOOL = 'school',
  DISTRICT = 'district',
  ALL = 'all',
}

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  USER_INACTIVE = 'USER_INACTIVE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  MFA_REQUIRED = 'MFA_REQUIRED',
}
