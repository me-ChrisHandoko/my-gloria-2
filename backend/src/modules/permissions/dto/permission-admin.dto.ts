import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class SystemOverviewDto {
  @ApiProperty({ description: 'Total number of permissions' })
  totalPermissions: number;

  @ApiProperty({ description: 'Total number of active permissions' })
  activePermissions: number;

  @ApiProperty({ description: 'Total number of permission groups' })
  totalGroups: number;

  @ApiProperty({ description: 'Total number of roles' })
  totalRoles: number;

  @ApiProperty({ description: 'Total number of users with permissions' })
  totalUsersWithPermissions: number;

  @ApiProperty({ description: 'Total number of resource permissions' })
  totalResourcePermissions: number;

  @ApiProperty({ description: 'Total number of active delegations' })
  activeDelegations: number;

  @ApiProperty({ description: 'Total number of permission templates' })
  totalTemplates: number;

  @ApiProperty({ description: 'Total number of dependencies' })
  totalDependencies: number;

  @ApiProperty({ description: 'System health status' })
  healthStatus: 'healthy' | 'warning' | 'critical';

  @ApiProperty({ description: 'Health issues if any' })
  healthIssues: string[];
}

export class PermissionConflictDto {
  @ApiProperty({ description: 'User profile ID with conflict' })
  userProfileId: string;

  @ApiProperty({ description: 'Permission code' })
  permissionCode: string;

  @ApiProperty({ description: 'Conflict type' })
  conflictType: 'explicit_deny' | 'role_conflict' | 'priority_conflict';

  @ApiProperty({ description: 'Description of the conflict' })
  description: string;

  @ApiProperty({ description: 'Sources of the conflict' })
  sources: Array<{
    type: 'role' | 'user' | 'resource';
    id: string;
    name: string;
    isGranted: boolean;
    priority?: number;
  }>;
}

export class OrphanedPermissionDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Permission code' })
  code: string;

  @ApiProperty({ description: 'Permission name' })
  name: string;

  @ApiProperty({ description: 'Reason for being orphaned' })
  reason: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;
}

export class UnusedPermissionDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Permission code' })
  code: string;

  @ApiProperty({ description: 'Permission name' })
  name: string;

  @ApiProperty({ description: 'Days since last use' })
  daysSinceLastUse: number;

  @ApiProperty({ description: 'Total times used' })
  totalUsage: number;
}

export class HealthCheckResultDto {
  @ApiProperty({ description: 'Overall health status' })
  status: 'healthy' | 'warning' | 'critical';

  @ApiProperty({ description: 'Checks performed' })
  checks: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    details?: any;
  }>;

  @ApiProperty({ description: 'Timestamp of health check' })
  timestamp: Date;

  @ApiProperty({ description: 'Total duration of health check in ms' })
  duration: number;
}

export class OptimizeCacheDto {
  @ApiPropertyOptional({
    description: 'Clear all cache',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  clearAll?: boolean = false;

  @ApiPropertyOptional({
    description: 'Rebuild cache for all users',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  rebuildAll?: boolean = false;
}

export class CacheOptimizationResultDto {
  @ApiProperty({ description: 'Keys cleared' })
  keysCleared: number;

  @ApiProperty({ description: 'Keys rebuilt' })
  keysRebuilt: number;

  @ApiProperty({ description: 'Operation duration in ms' })
  duration: number;

  @ApiProperty({ description: 'Status message' })
  message: string;
}

export class DetailedStatisticsDto {
  @ApiProperty({ description: 'Permission statistics' })
  permissions: {
    total: number;
    active: number;
    inactive: number;
    byResource: Record<string, number>;
    byAction: Record<string, number>;
  };

  @ApiProperty({ description: 'Role statistics' })
  roles: {
    total: number;
    active: number;
    byHierarchyLevel: Record<number, number>;
  };

  @ApiProperty({ description: 'User permission statistics' })
  userPermissions: {
    total: number;
    temporary: number;
    permanent: number;
    avgPriorityScore: number;
  };

  @ApiProperty({ description: 'Resource permission statistics' })
  resourcePermissions: {
    total: number;
    byResourceType: Record<string, number>;
    expired: number;
  };

  @ApiProperty({ description: 'Delegation statistics' })
  delegations: {
    active: number;
    expired: number;
    expiringIn7Days: number;
  };

  @ApiProperty({ description: 'Template statistics' })
  templates: {
    total: number;
    active: number;
    system: number;
    totalApplications: number;
  };

  @ApiProperty({ description: 'Audit statistics' })
  audit: {
    totalChanges: number;
    totalChecks: number;
    avgCheckDuration: number;
    deniedChecksLast24h: number;
  };
}
