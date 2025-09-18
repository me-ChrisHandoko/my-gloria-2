import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionScope } from '@prisma/client';

// Re-export the Prisma enums for convenience
export { PermissionAction, PermissionScope } from '@prisma/client';

export interface RequiredPermissionData {
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
}

export const PERMISSIONS_KEY = 'permissions';

// Main decorator for use in controllers
export const RequiredPermission = (
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope,
) => SetMetadata(PERMISSIONS_KEY, [{ resource, action, scope }]);

// Alternative decorator for multiple permissions
export const RequiredPermissions = (...permissions: RequiredPermissionData[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
