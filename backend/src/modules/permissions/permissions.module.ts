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
import { ModuleAccessService } from './services/module-access.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionValidationService } from './services/permission-validation.service';

// Controllers
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { ResourcePermissionsController } from './controllers/resource-permissions.controller';
import { PermissionDelegationController } from './controllers/permission-delegation.controller';
import { PermissionTemplatesController } from './controllers/permission-templates.controller';
import { ModuleAccessController } from './controllers/module-access.controller';

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
    ModuleAccessController,
  ],
  providers: [
    PermissionsService,
    RolesService,
    PermissionCalculationService,
    PermissionCacheService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionTemplatesService,
    ModuleAccessService,
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
    ModuleAccessService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
})
export class PermissionsModule {}
