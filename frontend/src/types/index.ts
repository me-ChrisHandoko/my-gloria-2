// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  nip?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  isActive?: boolean;
  settings?: Record<string, any>;
  parentId?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// School types
export interface School {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  type?: string;
  status?: string;
  isActive?: boolean;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Department types
export interface Department {
  id: string;
  name: string;
  description?: string;
  schoolId: string;
  organizationId: string;
  code?: string;
  isActive?: boolean;
  headId?: string;
  parentId?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Position types
export interface Position {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  schoolId: string;
  organizationId: string;
  code?: string;
  level?: number;
  isActive?: boolean;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId: string;
  read: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Audit types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
  createdAt: Date;
}

// Feature Flag types
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions?: Record<string, any>;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// System Config types
export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category?: string;
  isPublic?: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Permission types
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  category?: string;
  metadata?: {
    resources?: string[];
    resource?: string;
    [key: string]: any;
  };
  conditions?: Record<string, any>;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}