import { useCallback, useMemo } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  selectPermissions,
  selectRoles,
  checkPermission,
  checkRole,
} from '@/store/slices/authSlice';
import type { Permission, Role } from '@/types';

/**
 * Advanced permission checking hook with caching and performance optimizations
 * Provides comprehensive permission and role validation utilities
 */
export const usePermissions = () => {
  const dispatch = useAppDispatch();
  const permissions = useAppSelector(selectPermissions);
  const roles = useAppSelector(selectRoles);

  // Create permission map for O(1) lookups
  const permissionMap = useMemo(() => {
    return new Set(permissions);
  }, [permissions]);

  // Create role map for O(1) lookups
  const roleMap = useMemo(() => {
    return new Set(roles);
  }, [roles]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissionMap.has(permission);
    },
    [permissionMap]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.some(p => permissionMap.has(p));
    },
    [permissionMap]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.every(p => permissionMap.has(p));
    },
    [permissionMap]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return roleMap.has(role);
    },
    [roleMap]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roleList: string[]): boolean => {
      return roleList.some(r => roleMap.has(r));
    },
    [roleMap]
  );

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = useCallback(
    (roleList: string[]): boolean => {
      return roleList.every(r => roleMap.has(r));
    },
    [roleMap]
  );

  /**
   * Check permission with resource scope
   * Example: hasPermissionForResource('edit', 'document', '123')
   */
  const hasPermissionForResource = useCallback(
    (action: string, resource: string, resourceId?: string): boolean => {
      const permissionName = `${action}_${resource}`;
      const globalPermission = `${action}_all_${resource}s`;
      const ownerPermission = `${action}_own_${resource}`;

      // Check for global permission first
      if (permissionMap.has(globalPermission)) {
        return true;
      }

      // Check for specific permission
      const permission = permissionMap.has(permissionName);
      if (permission) {

        // If no resourceId specified, just check permission existence
        if (!resourceId) {
          return true;
        }

        // For string-based permissions, we can't check metadata
        // This would need backend support for resource-specific permissions

        return true;
      }

      // Check for owner permission (requires additional context)
      if (permissionMap.has(ownerPermission)) {
        // This would need to be implemented based on your ownership logic
        return true;
      }

      return false;
    },
    [permissionMap]
  );

  /**
   * Check permissions with conditional logic
   * Supports AND, OR, NOT operations
   */
  const evaluatePermissionExpression = useCallback(
    (expression: PermissionExpression): boolean => {
      if (typeof expression === 'string') {
        return hasPermission(expression);
      }

      if ('and' in expression) {
        return expression.and.every(exp => evaluatePermissionExpression(exp));
      }

      if ('or' in expression) {
        return expression.or.some(exp => evaluatePermissionExpression(exp));
      }

      if ('not' in expression) {
        return !evaluatePermissionExpression(expression.not);
      }

      return false;
    },
    [hasPermission]
  );

  /**
   * Get all permissions for a specific resource type
   */
  const getResourcePermissions = useCallback(
    (resource: string): string[] => {
      return permissions.filter(p =>
        p.includes(resource)
      );
    },
    [permissions]
  );

  /**
   * Check if user can perform CRUD operations
   */
  const canCRUD = useCallback(
    (resource: string) => ({
      canCreate: hasPermission(`create_${resource}`),
      canRead: hasPermission(`read_${resource}`) || hasPermission(`view_${resource}`),
      canUpdate: hasPermission(`update_${resource}`) || hasPermission(`edit_${resource}`),
      canDelete: hasPermission(`delete_${resource}`),
    }),
    [hasPermission]
  );

  /**
   * Async permission check with server validation
   */
  const validatePermission = useCallback(
    async (permission: string): Promise<boolean> => {
      try {
        const result = await dispatch(checkPermission(permission)).unwrap();
        return result;
      } catch (error) {
        console.error('Permission validation failed:', error);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Async role check with server validation
   */
  const validateRole = useCallback(
    async (role: string): Promise<boolean> => {
      try {
        const result = await dispatch(checkRole(role)).unwrap();
        return result;
      } catch (error) {
        console.error('Role validation failed:', error);
        return false;
      }
    },
    [dispatch]
  );

  // Computed permission groups
  const permissionGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};

    permissions.forEach(permission => {
      const category = 'general'; // Since permissions are strings, we use a default category
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
    });

    return groups;
  }, [permissions]);

  // Common permission checks
  const commonPermissions = useMemo(() => ({
    isAdmin: hasRole('admin'),
    isSuperAdmin: hasRole('super_admin'),
    isModerator: hasRole('moderator'),
    isUser: hasRole('user'),
    canManageUsers: hasPermission('manage_users'),
    canManageRoles: hasPermission('manage_roles'),
    canManagePermissions: hasPermission('manage_permissions'),
    canViewAnalytics: hasPermission('view_analytics'),
    canExportData: hasPermission('export_data'),
    canManageSettings: hasPermission('manage_settings'),
    canManageWorkflows: hasPermission('manage_workflows'),
    canApproveRequests: hasPermission('approve_requests'),
  }), [hasPermission, hasRole]);

  // Role hierarchy check
  const hasRoleHierarchy = useCallback(
    (requiredRole: string): boolean => {
      const hierarchy: Record<string, number> = {
        super_admin: 100,
        admin: 90,
        manager: 70,
        supervisor: 50,
        moderator: 30,
        user: 10,
        guest: 0,
      };

      const userMaxLevel = Math.max(
        ...roles.map(r => hierarchy[r] || 0)
      );

      const requiredLevel = hierarchy[requiredRole] || 0;
      return userMaxLevel >= requiredLevel;
    },
    [roles]
  );

  return {
    // Basic checks
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    hasAllRoles,

    // Advanced checks
    hasPermissionForResource,
    evaluatePermissionExpression,
    getResourcePermissions,
    canCRUD,
    hasRoleHierarchy,

    // Async validation
    validatePermission,
    validateRole,

    // Computed values
    permissionGroups,
    commonPermissions,

    // Utilities
    permissionMap,
    roleMap,
  };
};

// Type definitions
type PermissionExpression =
  | string
  | { and: PermissionExpression[] }
  | { or: PermissionExpression[] }
  | { not: PermissionExpression };

export type { PermissionExpression };