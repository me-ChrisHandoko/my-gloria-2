/**
 * Audit Logging Decorator
 * Production-ready decorator for audit logging of sensitive operations
 *
 * @module core/auth/decorators
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';

/**
 * Metadata key for audit logging
 */
export const AUDIT_LOG_KEY = 'auditLog';

/**
 * Audit log severity levels
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Audit log categories
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  CONFIGURATION = 'configuration',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  SYSTEM = 'system',
}

/**
 * Options for audit logging
 */
export interface AuditLogOptions {
  /** Action being performed */
  action: string;
  /** Resource being accessed or modified */
  resource?: string;
  /** Category of the audit event */
  category?: AuditCategory;
  /** Severity level of the event */
  severity?: AuditSeverity;
  /** Whether to include request body in log */
  includeBody?: boolean;
  /** Whether to include response in log */
  includeResponse?: boolean;
  /** Whether to mask sensitive data */
  maskSensitive?: boolean;
  /** Custom metadata to include */
  metadata?: Record<string, any>;
  /** Whether to alert on this action */
  alert?: boolean;
  /** Compliance standards this relates to */
  compliance?: string[];
}

/**
 * Marks an endpoint for audit logging
 *
 * @example
 * // Basic audit logging
 * @AuditLog({ action: 'user.delete', resource: 'user' })
 * @Delete(':id')
 * deleteUser(@Param('id') id: string) {
 *   return this.service.deleteUser(id);
 * }
 *
 * @example
 * // High severity audit logging with alert
 * @AuditLog({
 *   action: 'permissions.grant',
 *   resource: 'permissions',
 *   category: AuditCategory.AUTHORIZATION,
 *   severity: AuditSeverity.HIGH,
 *   alert: true
 * })
 * @Post('grant-admin')
 * grantAdmin(@Body() dto: GrantAdminDto) {
 *   return this.service.grantAdminAccess(dto);
 * }
 *
 * @example
 * // Compliance-related audit logging
 * @AuditLog({
 *   action: 'data.export',
 *   resource: 'personal_data',
 *   category: AuditCategory.COMPLIANCE,
 *   severity: AuditSeverity.MEDIUM,
 *   compliance: ['GDPR', 'CCPA'],
 *   includeBody: true
 * })
 * @Post('export-user-data')
 * exportUserData(@Body() dto: ExportDto) {
 *   return this.service.exportUserData(dto);
 * }
 *
 * @param options - Audit logging options
 * @returns Decorator function
 */
export const AuditLog = (options: AuditLogOptions): CustomDecorator => {
  return SetMetadata(AUDIT_LOG_KEY, {
    enabled: true,
    timestamp: new Date().toISOString(),
    severity: options.severity || AuditSeverity.MEDIUM,
    category: options.category || AuditCategory.DATA_ACCESS,
    maskSensitive: options.maskSensitive !== false,
    ...options,
  });
};

/**
 * Marks an endpoint for critical audit logging
 * Used for highly sensitive operations
 *
 * @example
 * @CriticalAudit('system.shutdown')
 * @Post('shutdown')
 * shutdownSystem() {
 *   return this.service.initiateShutdown();
 * }
 *
 * @param action - The critical action being performed
 * @returns Decorator function
 */
export const CriticalAudit = (action: string): CustomDecorator => {
  return AuditLog({
    action,
    severity: AuditSeverity.CRITICAL,
    alert: true,
    includeBody: true,
    includeResponse: true,
  });
};

/**
 * Marks an endpoint for security audit logging
 *
 * @example
 * @SecurityAudit('authentication.failed')
 * @Post('login')
 * login(@Body() credentials: LoginDto) {
 *   return this.service.authenticate(credentials);
 * }
 *
 * @param action - The security action being performed
 * @returns Decorator function
 */
export const SecurityAudit = (action: string): CustomDecorator => {
  return AuditLog({
    action,
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.HIGH,
    alert: true,
  });
};

/**
 * Marks an endpoint for compliance audit logging
 *
 * @example
 * @ComplianceAudit('data.deletion', ['GDPR', 'CCPA'])
 * @Delete('user/:id/data')
 * deleteUserData(@Param('id') id: string) {
 *   return this.service.deleteAllUserData(id);
 * }
 *
 * @param action - The compliance action being performed
 * @param standards - Compliance standards this relates to
 * @returns Decorator function
 */
export const ComplianceAudit = (
  action: string,
  standards: string[],
): CustomDecorator => {
  return AuditLog({
    action,
    category: AuditCategory.COMPLIANCE,
    severity: AuditSeverity.HIGH,
    compliance: standards,
    includeBody: true,
    includeResponse: true,
  });
};

/**
 * Marks an endpoint for data modification audit logging
 *
 * @example
 * @DataModificationAudit('user.profile.update', 'user')
 * @Patch('profile')
 * updateProfile(@Body() dto: UpdateProfileDto) {
 *   return this.service.updateProfile(dto);
 * }
 *
 * @param action - The modification action
 * @param resource - The resource being modified
 * @returns Decorator function
 */
export const DataModificationAudit = (
  action: string,
  resource: string,
): CustomDecorator => {
  return AuditLog({
    action,
    resource,
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.MEDIUM,
    includeBody: true,
    includeResponse: true,
  });
};
