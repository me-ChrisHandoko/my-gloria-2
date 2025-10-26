import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission } from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { RateLimit } from '@/core/auth/decorators/rate-limit.decorator';
import { ModuleCrudService } from '../services/module-crud.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  DeleteModuleDto,
  MoveModuleDto,
} from '../dto/module.dto';
import { PermissionAction, ModuleCategory } from '@prisma/client';

@ApiTags('Modules - CRUD')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ModuleCrudController {
  constructor(private readonly moduleCrudService: ModuleCrudService) {}

  @Post()
  @RequiredPermission('module', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create new module' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or duplicate code',
  })
  async create(@Body() dto: CreateModuleDto, @CurrentUser() user: any) {
    return this.moduleCrudService.createModule(dto, user.id);
  }

  @Get()
  @RateLimit({
    limit: 20,
    windowMs: 10000, // Type C standard: 20 req per 10 seconds
    message:
      'Too many module requests. Please wait a moment before trying again.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all modules',
    description:
      'Retrieves a paginated list of modules with optional filtering. Rate limited to 20 requests per 10 seconds. Cached for 60 seconds.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term (searches name, code, description)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ModuleCategory,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isVisible',
    required: false,
    type: Boolean,
    description: 'Filter by visibility status',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent ID (use "null" for root modules)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please wait before retrying.',
  })
  async getModules(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('category') category?: ModuleCategory,
    @Query('isActive') isActive?: boolean,
    @Query('isVisible') isVisible?: boolean,
    @Query('parentId') parentId?: string,
  ) {
    return this.moduleCrudService.findManyPaginated(
      {
        search,
        category,
        isActive,
        isVisible,
        parentId: parentId === 'null' ? null : parentId,
      },
      page,
      limit,
    );
  }

  @Get('tree')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get full module tree',
    description: 'Retrieves the complete module hierarchy',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module tree retrieved successfully',
  })
  async getTree() {
    return this.moduleCrudService.getModuleTree();
  }

  @Get('code/:code')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module by code' })
  @ApiParam({ name: 'code', description: 'Module code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async getByCode(@Param('code') code: string) {
    return this.moduleCrudService.findByCode(code);
  }

  @Get(':id')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleCrudService.findById(id);
  }

  @Get(':id/children')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module children' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Child modules retrieved successfully',
  })
  async getChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleCrudService.getChildren(id);
  }

  @Get(':id/ancestors')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module ancestors (parent chain)' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ancestor modules retrieved successfully',
  })
  async getAncestors(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleCrudService.getAncestors(id);
  }

  @Get(':id/history')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module change history' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change history retrieved successfully',
  })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleCrudService.getChangeHistory(id);
  }

  @Patch(':id')
  @RequiredPermission('module', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or duplicate code',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: any,
  ) {
    return this.moduleCrudService.updateModule(id, dto, user.id);
  }

  @Patch(':id/move')
  @RequiredPermission('module', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Move module to new parent' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module moved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid move operation (circular reference)',
  })
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveModuleDto,
    @CurrentUser() user: any,
  ) {
    return this.moduleCrudService.moveToParent(id, dto.newParentId ?? null, user.id);
  }

  @Delete(':id')
  @RequiredPermission('module', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Soft delete module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete module with active children',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteModuleDto,
    @CurrentUser() user: any,
  ) {
    return this.moduleCrudService.softDeleteModule(id, dto.reason, user.id);
  }
}
