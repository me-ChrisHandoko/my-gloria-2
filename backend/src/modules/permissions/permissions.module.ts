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
import { ModuleService } from './services/module.service';
import { ModuleCrudService } from './services/module-crud.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionValidationService } from './services/permission-validation.service';

// Controllers
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { ModuleCrudController } from './controllers/module-crud.controller';
import { ModulePermissionController } from './controllers/module-permission.controller';
import { ModuleRoleAccessController } from './controllers/module-role-access.controller';
import { ModuleUserAccessController } from './controllers/module-user-access.controller';

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
    ModuleCrudController,
    ModulePermissionController,
    ModuleRoleAccessController,
    ModuleUserAccessController,
  ],
  providers: [
    PermissionsService,
    RolesService,
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
    PermissionCalculationService,
    PermissionCacheService,
    ModuleService,
    ModuleCrudService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
})
export class PermissionsModule {}
