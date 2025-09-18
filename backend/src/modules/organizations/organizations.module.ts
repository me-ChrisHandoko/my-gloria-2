import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { CacheModule } from '../../core/cache/cache.module';
import { SchoolsController } from './controllers/schools.controller';
import { DepartmentsController } from './controllers/departments.controller';
import { PositionsController } from './controllers/positions.controller';
import { SchoolsService } from './services/schools.service';
import { DepartmentsService } from './services/departments.service';
import { PositionsService } from './services/positions.service';
import { OrganizationHierarchyService } from './services/organization-hierarchy.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [SchoolsController, DepartmentsController, PositionsController],
  providers: [
    SchoolsService,
    DepartmentsService,
    PositionsService,
    OrganizationHierarchyService,
  ],
  exports: [
    SchoolsService,
    DepartmentsService,
    PositionsService,
    OrganizationHierarchyService,
  ],
})
export class OrganizationsModule {}
