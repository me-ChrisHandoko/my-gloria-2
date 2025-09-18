import {
  PermissionAction,
  PermissionScope,
  ModuleCategory,
} from '@prisma/client';

export interface IPermission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope | null;
  groupId?: string | null;
  conditions?: any;
  metadata?: any;
  isSystemPermission: boolean;
  isActive: boolean;
}

export interface IPermissionGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: ModuleCategory;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  permissions?: IPermission[];
}

export interface IPermissionCheck {
  userId: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface IPermissionResult {
  hasPermission: boolean;
  permission?: IPermission;
  source?: 'role' | 'position' | 'direct' | 'delegation' | 'resource';
  conditions?: any;
  validUntil?: Date | null;
  reason?: string;
}

export interface IComputedPermissions {
  userId: string;
  permissions: IPermissionResult[];
  computedAt: Date;
  expiresAt: Date;
  cacheKey: string;
}

export interface IPermissionCondition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains';
  value: any;
}

export interface IPermissionFilter {
  resource?: string;
  action?: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  isActive?: boolean;
  isSystemPermission?: boolean;
}
