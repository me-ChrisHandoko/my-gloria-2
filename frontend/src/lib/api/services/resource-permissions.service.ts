import type { Permission, PermissionAction, PermissionScope } from './permissions.service';

export interface ResourcePermission {
  id: string;
  userProfileId: string;
  permissionId: string;
  resourceType: string;
  resourceId: string;
  isGranted: boolean;
  validFrom: string;
  validUntil?: string;
  grantedBy: string;
  grantReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations (populated when needed)
  userProfile?: {
    id: string;
    nip: string;
    dataKaryawan?: {
      nama?: string;
      email?: string;
    };
  };
  permission?: {
    id: string;
    code: string;
    name: string;
    action: PermissionAction;
    scope?: PermissionScope;
    resource: string;
  };
  grantedByUser?: {
    id: string;
    nip: string;
    dataKaryawan?: {
      nama?: string;
    };
  };
}

export interface GrantResourcePermissionDto {
  userProfileId: string;
  permissionId: string;
  resourceType: string;
  resourceId: string;
  grantReason?: string;
  validUntil?: string; // ISO date string
}

export interface RevokeResourcePermissionDto {
  userProfileId: string;
  permissionId: string;
  resourceType: string;
  resourceId: string;
}

export interface ResourcePermissionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  userProfileId?: string;
  resourceType?: string;
  resourceId?: string;
  permissionId?: string;
  isActive?: boolean; // Filter by validUntil
}

// Common resource types in the system
export const RESOURCE_TYPES = [
  'department',
  'school',
  'position',
  'workflow',
  'module',
  'role',
] as const;

export type ResourceType = typeof RESOURCE_TYPES[number];
