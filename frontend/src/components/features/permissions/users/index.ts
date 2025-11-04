/**
 * Users Permission Management Components
 * Phase 3 & 4: User Role and Permission Management
 *
 * Barrel export file for user permission management components.
 *
 * Components:
 * - UserAssignmentTabs: Main tabbed interface for managing user roles and permissions
 * - UserRolesList: List and manage user's role assignments
 * - UserPermissionsList: List and manage user's direct permissions
 * - UserRoleAssignment: Dialog for assigning roles to users
 * - UserPermissionAssignment: Dialog for assigning permissions to users
 * - UserPermissionAudit: Comprehensive permission audit view
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3 & 4
 */

export { default as UserAssignmentTabs } from './UserAssignmentTabs';
export { default as UserRolesList } from './UserRolesList';
export { default as UserPermissionsList } from './UserPermissionsList';
export { default as UserRoleAssignment } from './UserRoleAssignment';
export { default as UserPermissionAssignment } from './UserPermissionAssignment';
export { default as UserPermissionAudit } from './UserPermissionAudit';
