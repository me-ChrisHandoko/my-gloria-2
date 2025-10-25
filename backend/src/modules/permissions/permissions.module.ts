import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/core/database/prisma.module';
import { CacheModule } from '@/core/cache/cache.module';
import { AuditModule } from '@/core/audit/audit.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

// Services
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';
import { PermissionCalculationService } from './services/permission-calculation.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { ResourcePermissionsService } from './services/resource-permissions.service';
import { PermissionDelegationService } from './services/permission-delegation.service';
import { PermissionTemplatesService } from './services/permission-templates.service';
import { ModuleService } from './services/module.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionValidationService } from './services/permission-validation.service';

// Controllers
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { ResourcePermissionsController } from './controllers/resource-permissions.controller';
import { PermissionDelegationController } from './controllers/permission-delegation.controller';
import { PermissionTemplatesController } from './controllers/permission-templates.controller';
import { ModuleController } from './controllers/module.controller';

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
    ResourcePermissionsController,
    PermissionDelegationController,
    PermissionTemplatesController,
    ModuleController,
  ],
  providers: [
    PermissionsService,
    RolesService,
    PermissionCalculationService,
    PermissionCacheService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionTemplatesService,
    ModuleService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
  exports: [
    PermissionsService,
    RolesService,
    PermissionCalculationService,
    PermissionCacheService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionTemplatesService,
    ModuleService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
})
export class PermissionsModule {}
