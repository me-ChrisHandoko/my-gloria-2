import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { CacheModule } from '../../core/cache/cache.module';

// Services
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';
import { ModulesService } from './services/modules.service';
import { RolePermissionsService } from './services/role-permissions.service';
import { UserRolesService } from './services/user-roles.service';
import { PermissionCheckerService } from './services/permission-checker.service';
import { UserPermissionsService } from './services/user-permissions.service';

// Controllers
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { ModulesController } from './controllers/modules.controller';
import { UserRolesController } from './controllers/user-roles.controller';
import { UserPermissionsController } from './controllers/user-permissions.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [
    PermissionsController,
    RolesController,
    ModulesController,
    UserRolesController,
    UserPermissionsController,
  ],
  providers: [
    PermissionsService,
    RolesService,
    ModulesService,
    RolePermissionsService,
    UserRolesService,
    PermissionCheckerService,
    UserPermissionsService,
  ],
  exports: [
    PermissionsService,
    RolesService,
    ModulesService,
    RolePermissionsService,
    UserRolesService,
    PermissionCheckerService,
    UserPermissionsService,
  ],
})
export class PermissionModule {}
