/**
 * Modules Management Components
 *
 * Barrel export for all modules-related components.
 *
 * Main Components:
 * - ModulesPageTabs: Main page with List and Tree views
 * - ModuleList: Data table with CRUD operations
 * - ModuleTree: Hierarchical tree visualization
 * - ModuleForm: Create/Edit form
 * - ModulePermissionsView: Permissions management for a module
 *
 * Supporting Components:
 * - DeleteModuleDialog: Confirmation dialog for deletion
 * - ViewModuleDialog: Read-only module details
 * - AddModulePermissionForm: Form to add permissions to module
 */

// Main Components
export { default as ModulesPageTabs } from './ModulesPageTabs';
export { default as ModuleList } from './ModuleList';
export { default as ModuleTree } from './ModuleTree';
export { default as ModuleForm } from './ModuleForm';
export { default as ModulePermissionsView } from './ModulePermissionsView';

// Supporting Components
export { DeleteModuleDialog } from './DeleteModuleDialog';
export { ViewModuleDialog } from './ViewModuleDialog';
export { AddModulePermissionForm } from './AddModulePermissionForm';
