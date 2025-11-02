export interface PermissionUsageStatistics {
  totalPermissions: number;
  activePermissions: number;
  systemPermissions: number;
  permissionsByResource: Array<{
    resource: string;
    count: number;
  }>;
  permissionsByAction: Array<{
    action: string;
    count: number;
  }>;
  mostUsedPermissions: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
    };
    roleCount: number;
    userCount: number;
  }>;
}

export interface RoleUsageStatistics {
  totalRoles: number;
  activeRoles: number;
  systemRoles: number;
  rolesByHierarchyLevel: Array<{
    level: number;
    count: number;
  }>;
  rolesWithMostPermissions: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    permissionCount: number;
  }>;
  rolesWithMostUsers: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    userCount: number;
  }>;
}

export interface UserPermissionAudit {
  userProfile: {
    id: string;
    nip: string;
  };
  directRoles: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    assignedAt: Date;
    assignedBy: string;
  }>;
  effectivePermissions: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
    };
    source: 'DIRECT_USER' | 'ROLE' | 'INHERITED';
    sourceDetails: string;
    scope: string | null;
    priority: number;
  }>;
  moduleAccess: Array<{
    module: {
      id: string;
      code: string;
      name: string;
    };
    permissions: Record<string, any>;
    grantedBy: string;
    grantedAt: Date;
  }>;
  summary: {
    totalRoles: number;
    totalPermissions: number;
    totalModules: number;
  };
}
