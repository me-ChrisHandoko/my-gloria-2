import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/core/database/prisma.module';
import { CacheModule } from '@/core/cache/cache.module';
import { AuditModule } from '@/core/audit/audit.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

// Services
import { PermissionsService } from './services/permission.service';
import { RolesService } from './services/role.service';
import { PermissionCalculationService } from './services/permission-calculation.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { ModuleService } from './services/module.service';
import { ModuleCrudService } from './services/module-crud.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { RolePermissionsService } from './services/permission-roles.service';
import { UserPermissionsService } from './services/permission-users.service';
import { ResourcePermissionsService } from './services/permission-resources.service';
import { PermissionDelegationService } from './services/permission-delegation.service';
import { PermissionHistoryService } from './services/permission-history.service';
import { PermissionCheckLogService } from './services/permission-check-log.service';
import { PermissionAdminService } from './services/permission-admin.service';

// Controllers
import { PermissionsController } from './controllers/permission.controller';
import { RolesController } from './controllers/role.controller';
import { ModuleCrudController } from './controllers/module-crud.controller';
import { ModulePermissionController } from './controllers/module-permission.controller';
import { ModuleRoleAccessController } from './controllers/module-role-access.controller';
import { ModuleUserAccessController } from './controllers/module-user-access.controller';
import { RolePermissionsController } from './controllers/permission-roles.controller';
import { UserPermissionsController } from './controllers/permission-users.controller';
import { ResourcePermissionsController } from './controllers/permission-resources.controller';
import { PermissionDelegationController } from './controllers/permission-delegation.controller';
import { PermissionHistoryController } from './controllers/permission-history.controller';
import { PermissionCheckLogController } from './controllers/permission-check-log.controller';
import { PermissionAdminController } from './controllers/permission-admin.controller';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuditModule,
    forwardRef(() => UsersModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [
    PermissionsController,
    RolesController,
    RolePermissionsController,
    UserPermissionsController,
    ResourcePermissionsController,
    PermissionDelegationController,
    PermissionHistoryController,
    PermissionCheckLogController,
    PermissionAdminController,
    ModuleCrudController,
    ModulePermissionController,
    ModuleRoleAccessController,
    ModuleUserAccessController,
  ],
  providers: [
    PermissionsService,
    RolesService,
    RolePermissionsService,
    UserPermissionsService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionHistoryService,
    PermissionCheckLogService,
    PermissionAdminService,
    PermissionCalculationService,
    PermissionCacheService,
    ModuleService,
    ModuleCrudService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
  exports: [
    PermissionsService,
    RolesService,
    RolePermissionsService,
    UserPermissionsService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionHistoryService,
    PermissionCheckLogService,
    PermissionAdminService,
    PermissionCalculationService,
    PermissionCacheService,
    ModuleService,
    ModuleCrudService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
})
export class PermissionModule {}
