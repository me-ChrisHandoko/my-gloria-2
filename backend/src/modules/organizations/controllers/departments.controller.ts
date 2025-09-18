import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
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
import { DepartmentsService } from '../services/departments.service';
import { OrganizationHierarchyService } from '../services/organization-hierarchy.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentDto,
  DepartmentResponseDto,
  PaginatedDepartmentResponseDto,
  DepartmentHierarchyDto,
} from '../dto/department.dto';
import {
  RequiredPermissions,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';

@ApiTags('Organizations - Departments')
@ApiBearerAuth()
@Controller({
  path: 'organizations/departments',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly hierarchyService: OrganizationHierarchyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.CREATE,
  })
  @AuditLog({ action: 'CREATE_DEPARTMENT' })
  @ApiOperation({
    summary: 'Create a new department',
    description:
      'Creates a new department within a school. Requires admin permissions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Department created successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department with the same code already exists in the school',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School or parent department not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid department data provided',
  })
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() user: any,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get all departments',
    description:
      'Retrieves a paginated list of departments with optional filtering.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Departments retrieved successfully',
    type: PaginatedDepartmentResponseDto,
  })
  async findAll(
    @Query() query: QueryDepartmentDto,
  ): Promise<PaginatedDepartmentResponseDto> {
    return this.departmentsService.findAll(query);
  }

  @Get('hierarchy/:schoolId')
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get department hierarchy for a school',
    description:
      'Retrieves the hierarchical structure of departments within a school.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department hierarchy retrieved successfully',
    type: [DepartmentHierarchyDto],
  })
  async getHierarchy(
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
  ): Promise<DepartmentHierarchyDto[]> {
    return this.departmentsService.getHierarchy(schoolId);
  }

  @Get(':id')
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get department by ID',
    description: 'Retrieves a specific department by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department retrieved successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.findOne(id);
  }

  @Get(':id/users')
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get department users',
    description:
      'Retrieves all users assigned to positions within a department.',
  })
  @ApiParam({
    name: 'id',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department users retrieved successfully',
  })
  async getDepartmentUsers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hierarchyService.getDepartmentUsers(id);
  }

  @Patch(':id')
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.UPDATE,
  })
  @AuditLog({ action: 'UPDATE_DEPARTMENT' })
  @ApiOperation({
    summary: 'Update department',
    description:
      'Updates a department with the provided data. Cannot change the school ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department code already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Circular reference detected or invalid parent',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() user: any,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions({
    resource: 'departments',
    action: PermissionAction.DELETE,
  })
  @AuditLog({ action: 'DELETE_DEPARTMENT' })
  @ApiOperation({
    summary: 'Soft delete department',
    description:
      'Marks a department as inactive. The department must not have any positions or child departments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department deleted successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete department with existing positions or child departments',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
  ): Promise<DepartmentResponseDto> {
    return this.departmentsService.remove(id);
  }
}
