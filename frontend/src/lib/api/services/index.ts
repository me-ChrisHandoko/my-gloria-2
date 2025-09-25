/**
 * API Services Index
 * Central export point for all API services
 */

export { authService } from './auth.service';
// TODO: Uncomment when these services are implemented
// export { userService } from './user.service';
// export { organizationService } from './organization.service';
// export { permissionService } from './permission.service';
// export { workflowService } from './workflow.service';
// export { notificationService } from './notification.service';
// export { auditService } from './audit.service';
// export { featureFlagService } from './feature-flag.service';
// export { systemConfigService } from './system-config.service';

/**
 * Export all services as a single object for convenience
 */
export const apiServices = {
  auth: require('./auth.service').authService,
  // TODO: Uncomment when these services are implemented
  // users: require('./user.service').userService,
  // organizations: require('./organization.service').organizationService,
  // permissions: require('./permission.service').permissionService,
  // workflows: require('./workflow.service').workflowService,
  // notifications: require('./notification.service').notificationService,
  // audit: require('./audit.service').auditService,
  // featureFlags: require('./feature-flag.service').featureFlagService,
  // systemConfig: require('./system-config.service').systemConfigService,
};

/**
 * Type definitions for service instances
 */
// TODO: Uncomment when these services are implemented
// export type { default as AuthService } from './auth.service';
// export type { default as UserService } from './user.service';
// export type { default as OrganizationService } from './organization.service';
// export type { default as PermissionService } from './permission.service';
// export type { default as WorkflowService } from './workflow.service';
// export type { default as NotificationService } from './notification.service';
// export type { default as AuditService } from './audit.service';
// export type { default as FeatureFlagService } from './feature-flag.service';
// export type { default as SystemConfigService } from './system-config.service';