export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'IMPORT'
  | 'PRINT'
  | 'ASSIGN'
  | 'CLOSE';

export type PermissionScope = 'OWN' | 'DEPARTMENT' | 'SCHOOL' | 'ALL';

export type ModuleCategory =
  | 'SERVICE'
  | 'PERFORMANCE'
  | 'QUALITY'
  | 'FEEDBACK'
  | 'TRAINING'
  | 'SYSTEM';

export interface PermissionGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: ModuleCategory;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  group?: PermissionGroup;
  conditions?: any;
  metadata?: any;
  isSystemPermission: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  isSystemPermission?: boolean;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
  scope?: PermissionScope;
  groupId?: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface PermissionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
  action?: PermissionAction;
  groupId?: string;
  isActive?: boolean;
}

export interface PermissionStatistics {
  totalPermissions: number;
  activePermissions: number;
  systemPermissions: number;
  permissionsByAction: Record<PermissionAction, number>;
  permissionsByScope: Record<PermissionScope, number>;
  permissionsByGroup: Array<{
    groupId: string;
    groupName: string;
    count: number;
  }>;
}
