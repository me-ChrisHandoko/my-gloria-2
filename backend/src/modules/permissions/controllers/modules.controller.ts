import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ModulesService } from '../services/modules.service';
import { ModulePermissionsService } from '../services/module-permissions.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  QueryModuleDto,
  ModuleResponseDto,
  PaginatedModuleResponseDto,
} from '../dto/module.dto';
import { ModulePermissionResponseDto } from '../dto/module-permission.dto';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Permissions - Modules')
@ApiBearerAuth()
@Controller({
  path: 'permissions/modules',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class ModulesController {
  constructor(
    private readonly modulesService: ModulesService,
    private readonly modulePermissionsService: ModulePermissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('modules', PermissionAction.CREATE)
  @AuditLog({ action: 'CREATE_MODULE' })
  @ApiOperation({
    summary: 'Create a new module',
    description:
      'Creates a new system module with optional parent-child hierarchy.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module created successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Module with the same code already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid module data or parent module not found',
  })
  async create(
    @Body() createModuleDto: CreateModuleDto,
  ): Promise<ModuleResponseDto> {
    return this.modulesService.create(createModuleDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all modules',
    description:
      'Retrieves a paginated list of modules with optional filtering and sorting.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules retrieved successfully',
    type: PaginatedModuleResponseDto,
  })
  async findAll(
    @Query() query: QueryModuleDto,
  ): Promise<PaginatedModuleResponseDto> {
    return this.modulesService.findAll(query);
  }

  @Get('tree')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get module tree structure',
    description:
      'Retrieves all active modules organized in hierarchical tree structure.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module tree retrieved successfully',
    type: [ModuleResponseDto],
  })
  async findTree(): Promise<ModuleResponseDto[]> {
    return this.modulesService.findTree();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get module by ID',
    description: 'Retrieves a single module by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module retrieved successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ModuleResponseDto> {
    return this.modulesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.UPDATE)
  @AuditLog({ action: 'UPDATE_MODULE' })
  @ApiOperation({
    summary: 'Update module',
    description:
      'Updates an existing module. Validates parent relationships and prevents circular references.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or circular reference detected',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ): Promise<ModuleResponseDto> {
    return this.modulesService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.DELETE)
  @AuditLog({ action: 'DELETE_MODULE' })
  @ApiOperation({
    summary: 'Delete module (soft delete with version)',
    description:
      'Soft deletes a module with version increment. Cannot delete modules with child modules.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module deleted successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete module with child modules',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ModuleResponseDto> {
    return this.modulesService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.UPDATE)
  @AuditLog({ action: 'RESTORE_MODULE' })
  @ApiOperation({
    summary: 'Restore deleted module',
    description:
      'Restores a soft-deleted module. Parent module must be active.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module restored successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Module is not deleted or parent module is not active',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ModuleResponseDto> {
    return this.modulesService.restore(id);
  }

  // Module Navigation API

  @Get(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get module permissions',
    description:
      'Retrieves all permissions available for a specific module.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module permissions retrieved successfully',
    type: [ModulePermissionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async getModulePermissions(
    @Param('id', ParseUUIDPipe) moduleId: string,
  ): Promise<ModulePermissionResponseDto[]> {
    return this.modulePermissionsService.findByModule(moduleId);
  }
}
