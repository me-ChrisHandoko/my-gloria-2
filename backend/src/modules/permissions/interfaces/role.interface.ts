export interface IRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  isSystemRole: boolean;
  isActive: boolean;
}

export interface IRoleHierarchy {
  roleId: string;
  parentRoleId: string;
  inheritPermissions: boolean;
}

export interface IRolePermission {
  roleId: string;
  permissionId: string;
  isGranted: boolean;
  conditions?: any;
  validFrom: Date;
  validUntil?: Date;
  grantedBy?: string;
  grantReason?: string;
}

export interface IUserRole {
  userProfileId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
}

export interface IRoleWithPermissions extends IRole {
  permissions: IRolePermission[];
  parentRoles?: IRole[];
  childRoles?: IRole[];
}

export interface IRoleTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: string[]; // Permission IDs
  isActive: boolean;
}
