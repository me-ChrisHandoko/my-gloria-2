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
  ApiBody,
} from '@nestjs/swagger';
import { PositionsService } from '../services/positions.service';
import { OrganizationHierarchyService } from '../services/organization-hierarchy.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  QueryPositionDto,
  PositionResponseDto,
  PaginatedPositionResponseDto,
  PositionHierarchyDto,
} from '../dto/position.dto';
import {
  RequiredPermissions,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { RateLimit } from '../../../core/auth/decorators/rate-limit.decorator';

@ApiTags('Organizations - Positions')
@ApiBearerAuth()
@Controller({
  path: 'organizations/positions',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class PositionsController {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly hierarchyService: OrganizationHierarchyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermissions({
    resource: 'positions',
    action: PermissionAction.CREATE,
  })
  @AuditLog({ action: 'CREATE_POSITION' })
  @ApiOperation({
    summary: 'Create a new position',
    description:
      'Creates a new position within a department. Requires admin permissions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Position created successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Position with the same code already exists in the department',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department or parent position not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid position data provided',
  })
  async create(
    @Body() createPositionDto: CreatePositionDto,
    @CurrentUser() user: any,
  ): Promise<PositionResponseDto> {
    return this.positionsService.create(createPositionDto);
  }

  @Get()
  @RateLimit({
    limit: 20,
    windowMs: 10000, // 20 requests per 10 seconds
    message: 'Too many search requests. Please wait a moment before trying again.',
    headers: true,
  })
  @RequiredPermissions({ resource: 'positions', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get all positions',
    description:
      'Retrieves a paginated list of positions with optional filtering. Rate limited to 20 requests per 10 seconds.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Positions retrieved successfully',
    type: PaginatedPositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please wait before retrying.',
  })
  async findAll(
    @Query() query: QueryPositionDto,
  ): Promise<PaginatedPositionResponseDto> {
    return this.positionsService.findAll(query);
  }

  @Get('hierarchy/:departmentId')
  @RequiredPermissions({ resource: 'positions', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get position hierarchy for a department',
    description:
      'Retrieves the hierarchical structure of positions within a department.',
  })
  @ApiParam({
    name: 'departmentId',
    description: 'Department UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position hierarchy retrieved successfully',
    type: [PositionHierarchyDto],
  })
  async getHierarchy(
    @Param('departmentId', new ParseUUIDPipe()) departmentId: string,
  ): Promise<PositionHierarchyDto[]> {
    return this.positionsService.getHierarchy(departmentId);
  }

  @Get(':id')
  @RequiredPermissions({ resource: 'positions', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get position by ID',
    description: 'Retrieves a specific position by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Position UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position retrieved successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Position not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PositionResponseDto> {
    return this.positionsService.findOne(id);
  }

  @Get(':id/users')
  @RequiredPermissions({ resource: 'positions', action: PermissionAction.READ })
  @ApiOperation({
    summary: 'Get position users',
    description: 'Retrieves all users assigned to a specific position.',
  })
  @ApiParam({
    name: 'id',
    description: 'Position UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position users retrieved successfully',
  })
  async getPositionUsers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hierarchyService.getPositionUsers(id);
  }

  @Post(':id/assign-user')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions({
    resource: 'positions',
    action: PermissionAction.UPDATE,
  })
  @AuditLog({ action: 'ASSIGN_USER_TO_POSITION' })
  @ApiOperation({
    summary: 'Assign user to position',
    description: 'Assigns a user to a specific position.',
  })
  @ApiParam({
    name: 'id',
    description: 'Position UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Start date of assignment (optional)',
          example: '2024-01-01T00:00:00.000Z',
        },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User assigned to position successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Position or user not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Position is inactive or has reached maximum occupancy',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already assigned to this position',
  })
  async assignUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { userId: string; startDate?: Date },
    @CurrentUser() user: any,
  ) {
    await this.positionsService.assignUserToPosition(
      body.userId,
      id,
      body.startDate,
    );
    return { message: 'User assigned to position successfully' };
  }

  @Patch(':id')
  @RequiredPermissions({
    resource: 'positions',
    action: PermissionAction.UPDATE,
  })
  @AuditLog({ action: 'UPDATE_POSITION' })
  @ApiOperation({
    summary: 'Update position',
    description:
      'Updates a position with the provided data. Cannot change the department ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Position UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position updated successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Position not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Position code already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Circular reference detected or invalid parent',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePositionDto: UpdatePositionDto,
    @CurrentUser() user: any,
  ): Promise<PositionResponseDto> {
    return this.positionsService.update(id, updatePositionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions({
    resource: 'positions',
    action: PermissionAction.DELETE,
  })
  @AuditLog({ action: 'DELETE_POSITION' })
  @ApiOperation({
    summary: 'Soft delete position',
    description:
      'Marks a position as inactive. The position must not have any users or child positions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Position UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position deleted successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Position not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete position with existing users or child positions',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
  ): Promise<PositionResponseDto> {
    return this.positionsService.remove(id);
  }
}
