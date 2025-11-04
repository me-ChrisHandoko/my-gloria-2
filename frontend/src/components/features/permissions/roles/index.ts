/**
 * Roles Components Barrel Export
 *
 * Central export point for all role management components.
 * Provides clean imports for consuming code.
 *
 * @example
 * ```tsx
 * import {
 *   RoleList,
 *   RoleForm,
 *   RoleDetailTabs,
 *   RolesPageTabs
 * } from '@/components/features/permissions/roles';
 * ```
 */

// Main Components
export { default as RoleList } from './RoleList';
export { default as RoleHierarchyTree } from './RoleHierarchyTree';
export { default as RoleForm } from './RoleForm';
export { default as RoleInfo } from './RoleInfo';
export { default as RolePermissionsTab } from './RolePermissionsTab';
export { default as RoleModulesTab } from './RoleModulesTab';
export { default as RoleDetailTabs } from './RoleDetailTabs';
export { default as DeleteRoleDialog } from './DeleteRoleDialog';
export { default as RolesPageTabs } from './RolesPageTabs';

/**
 * Component Organization:
 *
 * 1. RoleList - Data table with CRUD operations
 *    - Server-side pagination
 *    - Sorting and filtering
 *    - Bulk operations
 *    - Row actions (View, Edit, Delete)
 *
 * 2. RoleHierarchyTree - Tree visualization
 *    - Recursive tree structure
 *    - Expand/collapse nodes
 *    - Drag-and-drop support (future)
 *    - Context menu operations
 *
 * 3. RoleForm - Create/Edit form
 *    - Form validation with zod
 *    - Parent role selector
 *    - Real-time validation
 *
 * 4. RoleInfo - Information display
 *    - Read-only role details
 *    - Organized sections
 *    - Visual indicators
 *
 * 5. RolePermissionsTab - Permission assignment
 *    - Two-column layout
 *    - Assign/Revoke permissions
 *    - Bulk operations
 *    - Search and filter
 *
 * 6. RoleModulesTab - Module access management
 *    - Two-column layout
 *    - Access level selector
 *    - Grant/Revoke access
 *    - Bulk operations
 *
 * 7. RoleDetailTabs - Detail page with tabs
 *    - Info | Permissions | Modules
 *    - Loading states
 *    - Error handling
 *
 * 8. DeleteRoleDialog - Delete confirmation
 *    - Dependency checking
 *    - Confirmation input
 *    - Soft delete
 *
 * 9. RolesPageTabs - Main page component
 *    - List | Hierarchy tabs
 *    - Create role dialog
 *    - Export functionality
 *    - Global filters
 */
