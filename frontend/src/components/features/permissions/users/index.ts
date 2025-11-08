/**
 * Users Permission Management Components
 * Phase 3 & 4: User Role and Permission Management
 *
 * Barrel export file for user permission management components.
 *
 * Components:
 * - UsersPageTabs: Main page component with tabbed interface for user listing
 * - UsersList: Data table component for displaying and managing users
 * - UserAssignmentTabs: Tabbed interface for managing individual user roles and permissions
 * - UserRolesList: List and manage user's role assignments
 * - UserPermissionsList: List and manage user's direct permissions
 * - UserRoleAssignment: Dialog for assigning roles to users
 * - UserPermissionAssignment: Dialog for assigning permissions to users
 * - UserPermissionAudit: Comprehensive permission audit view
 *
 * Note: Users are automatically created via Clerk authentication sync.
 * Manual user creation component is not included.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3 & 4
 */

export { default as UsersPageTabs } from './UsersPageTabs';
export { default as UsersList } from './UsersList';
export { default as UserAssignmentTabs } from './UserAssignmentTabs';
export { default as UserRolesList } from './UserRolesList';
export { default as UserPermissionsList } from './UserPermissionsList';
export { default as UserRoleAssignment } from './UserRoleAssignment';
export { default as UserPermissionAssignment } from './UserPermissionAssignment';
export { default as UserPermissionAudit } from './UserPermissionAudit';
