import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/modules/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequiredPermissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PermissionHistoryService } from '../services/permission-history.service';
import {
  GetHistoryFilterDto,
  RollbackChangeDto,
  CompareStatesDto,
  ExportHistoryDto,
  HistoryResponseDto,
  CompareStatesResponseDto,
  RollbackHistoryDto,
  HistoryEntityType,
} from '../dto/permission-history.dto';

@ApiTags('Permission History')
@ApiBearerAuth()
@Controller('permission-history')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionHistoryController {
  constructor(private readonly historyService: PermissionHistoryService) {}

  @Get()
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'List all permission changes',
    description: 'Get paginated list of all permission change history with optional filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change history retrieved successfully',
    type: [HistoryResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async getChangeHistory(@Query() filters: GetHistoryFilterDto) {
    return this.historyService.getChangeHistory(filters);
  }

  @Get(':entityType/:entityId')
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'Get entity change history',
    description: 'Get all changes for a specific entity (role, user, resource, etc.)',
  })
  @ApiParam({
    name: 'entityType',
    enum: HistoryEntityType,
    description: 'Type of entity',
  })
  @ApiParam({
    name: 'entityId',
    description: 'Entity identifier',
    example: 'cm123abc456def',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entity history retrieved successfully',
    type: [HistoryResponseDto],
  })
  async getEntityHistory(
    @Param('entityType') entityType: HistoryEntityType,
    @Param('entityId') entityId: string,
    @Query() filters: Partial<GetHistoryFilterDto>,
  ) {
    return this.historyService.getEntityHistory(entityType, entityId, filters);
  }

  @Get('users/:userId')
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'Get changes by user',
    description: 'Get all changes performed by a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User profile ID',
    example: 'cm123abc456def',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User changes retrieved successfully',
    type: [HistoryResponseDto],
  })
  async getUserChanges(
    @Param('userId') userId: string,
    @Query() filters: Partial<GetHistoryFilterDto>,
  ) {
    return this.historyService.getUserChanges(userId, filters);
  }

  @Get('date-range')
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'Get changes in date range',
    description: 'Get all changes within a specified date range',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date for range',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date for range',
    example: '2025-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Changes in date range retrieved successfully',
    type: [HistoryResponseDto],
  })
  async getChangesByDateRange(@Query() filters: GetHistoryFilterDto) {
    if (!filters.startDate || !filters.endDate) {
      throw new Error('startDate and endDate are required');
    }

    return this.historyService.getChangesByDateRange(
      filters.startDate,
      filters.endDate,
      filters,
    );
  }

  @Post(':changeId/rollback')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('PERMISSION_HISTORY_ROLLBACK')
  @ApiOperation({
    summary: 'Rollback a change',
    description:
      'Rollback a specific permission change to its previous state. Creates a new history entry for the rollback operation.',
  })
  @ApiParam({
    name: 'changeId',
    description: 'Change history ID to rollback',
    example: 'change_abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change rolled back successfully',
    type: HistoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Change cannot be rolled back or is a rollback itself',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Change history not found',
  })
  async rollbackChange(
    @Param('changeId') changeId: string,
    @Body() dto: RollbackChangeDto,
    @CurrentUser() user: any,
  ) {
    return this.historyService.rollbackChange(changeId, dto, user.userProfileId);
  }

  @Get('compare/:id1/:id2')
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'Compare two states',
    description:
      'Compare the states of two different change history entries and show differences',
  })
  @ApiParam({
    name: 'id1',
    description: 'First change ID',
    example: 'change_abc123',
  })
  @ApiParam({
    name: 'id2',
    description: 'Second change ID',
    example: 'change_def456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'States compared successfully',
    type: CompareStatesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'One or both change records not found',
  })
  async compareStates(
    @Param('id1') id1: string,
    @Param('id2') id2: string,
  ) {
    const dto: CompareStatesDto = {
      changeId1: id1,
      changeId2: id2,
    };
    return this.historyService.compareStates(dto);
  }

  @Get('rollbacks')
  @RequiredPermissions('PERMISSION_HISTORY_VIEW')
  @ApiOperation({
    summary: 'List rollback history',
    description: 'Get all rollback operations performed on permission changes',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rollback history retrieved successfully',
    type: [HistoryResponseDto],
  })
  async getRollbackHistory(@Query() filters: RollbackHistoryDto) {
    return this.historyService.getRollbackHistory(filters);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('PERMISSION_HISTORY_EXPORT')
  @ApiOperation({
    summary: 'Export history for compliance',
    description:
      'Export permission change history in CSV or JSON format for compliance and auditing purposes',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'History exported successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid export parameters',
  })
  async exportHistory(@Body() dto: ExportHistoryDto) {
    return this.historyService.exportHistory(dto);
  }
}
