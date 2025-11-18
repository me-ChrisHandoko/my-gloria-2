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
import { SchoolsService } from '../services/schools.service';
import { OrganizationHierarchyService } from '../services/organization-hierarchy.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  QuerySchoolDto,
  SchoolResponseDto,
  PaginatedSchoolResponseDto,
} from '../dto/school.dto';
import {
  RequiredPermissions,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { Public } from '../../../core/auth/decorators/public.decorator';

@ApiTags('Organizations - Schools')
@ApiBearerAuth()
@Controller({
  path: 'organizations/schools',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly hierarchyService: OrganizationHierarchyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.CREATE })
  @AuditLog({ action: 'CREATE_SCHOOL' })
  @ApiOperation({
    summary: 'Create a new school',
    description:
      'Creates a new school in the organization. Requires admin permissions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'School created successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'School with the same code already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid school data provided',
  })
  async create(
    @Body() createSchoolDto: CreateSchoolDto,
    @CurrentUser() user: any,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get all schools',
    description:
      'Retrieves a paginated list of schools with optional filtering.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schools retrieved successfully',
    type: PaginatedSchoolResponseDto,
  })
  async findAll(
    @Query() query: QuerySchoolDto,
  ): Promise<PaginatedSchoolResponseDto> {
    return this.schoolsService.findAll(query);
  }

  @Get('bagian-kerja-jenjang')
  @Public()
  @ApiOperation({
    summary: 'Get bagian kerja jenjang list',
    description:
      'Retrieves list of distinct bagian_kerja from data_karyawan table for school code options. This endpoint is public for dropdown population.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bagian kerja jenjang list retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['ADMIN', 'GURU', 'KEPALA SEKOLAH'],
    },
  })
  async getBagianKerjaJenjangList(): Promise<string[]> {
    return this.schoolsService.getBagianKerjaJenjangList();
  }

  @Get('karyawan-names')
  @Public()
  @ApiOperation({
    summary: 'Get karyawan names list',
    description:
      'Retrieves list of employee names from data_karyawan table for principal selection. This endpoint is public for dropdown population.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Karyawan names list retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Dr. John Doe', 'Jane Smith', 'Ahmad Rahman'],
    },
  })
  async getKaryawanNamesList(): Promise<string[]> {
    return this.schoolsService.getKaryawanNamesList();
  }

  @Get('statistics')
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get school statistics',
    description: 'Retrieves statistics about schools in the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalSchools: { type: 'number', example: 10 },
        activeSchools: { type: 'number', example: 8 },
        inactiveSchools: { type: 'number', example: 2 },
        totalDepartments: { type: 'number', example: 50 },
        totalUsers: { type: 'number', example: 500 },
      },
    },
  })
  async getStatistics(@Query('schoolId') schoolId?: string) {
    return this.schoolsService.getStatistics(schoolId);
  }

  @Get(':id')
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get school by ID',
    description: 'Retrieves a specific school by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School retrieved successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.findOne(id);
  }

  @Get('by-code/:code')
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get school by code',
    description: 'Retrieves a school by its unique code.',
  })
  @ApiParam({
    name: 'code',
    description: 'School code',
    example: 'GHS001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School retrieved successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School not found',
  })
  async findByCode(@Param('code') code: string): Promise<SchoolResponseDto> {
    return this.schoolsService.findByCode(code);
  }

  @Get(':id/hierarchy')
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get school hierarchy',
    description:
      'Retrieves the complete organizational hierarchy for a school.',
  })
  @ApiParam({
    name: 'id',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hierarchy retrieved successfully',
  })
  async getHierarchy(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hierarchyService.getSchoolHierarchy(id);
  }

  @Patch(':id')
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.UPDATE })
  @AuditLog({ action: 'UPDATE_SCHOOL' })
  @ApiOperation({
    summary: 'Update school',
    description: 'Updates a school with the provided data.',
  })
  @ApiParam({
    name: 'id',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School updated successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'School code already exists',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
    @CurrentUser() user: any,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.DELETE })
  @AuditLog({ action: 'DELETE_SCHOOL' })
  @ApiOperation({
    summary: 'Soft delete school',
    description:
      'Marks a school as inactive. The school must not have any departments or users.',
  })
  @ApiParam({
    name: 'id',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School deleted successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete school with existing departments or users',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions({ resource: 'schools', action: PermissionAction.UPDATE })
  @AuditLog({ action: 'RESTORE_SCHOOL' })
  @ApiOperation({
    summary: 'Restore soft-deleted school',
    description:
      'Restores a previously soft-deleted school by marking it as active.',
  })
  @ApiParam({
    name: 'id',
    description: 'School UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'School restored successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'School not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'School is already active',
  })
  async restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
  ): Promise<SchoolResponseDto> {
    return this.schoolsService.restore(id);
  }
}
