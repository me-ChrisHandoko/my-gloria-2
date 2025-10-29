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
  ParseIntPipe,
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
import {
  DataModificationAudit,
  AuditLog,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
import { PermissionDelegationService } from '../services/permission-delegation.service';
import {
  CreatePermissionDelegationDto,
  RevokeDelegationDto,
  ExtendDelegationDto,
  GetDelegationsFilterDto,
} from '../dto/permission-delegation.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permission Delegations')
@ApiBearerAuth()
@Controller('permission-delegations')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionDelegationController {
  constructor(
    private readonly delegationService: PermissionDelegationService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit(
    'permission_delegation.create',
    'permission_delegation',
  )
  @ApiOperation({
    summary: 'Create permission delegation',
    description:
      'Delegate permissions to another user temporarily (e.g., vacation coverage)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Delegation created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Overlapping active delegation exists',
  })
  async createDelegation(
    @Body() dto: CreatePermissionDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.createDelegation(user.id, dto, user.id);
  }

  @Get('sent')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get delegations sent by current user',
    description: 'Retrieves delegations where current user is the delegator',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isRevoked',
    required: false,
    type: Boolean,
    description: 'Filter by revoked status',
  })
  @ApiQuery({
    name: 'delegateId',
    required: false,
    description: 'Filter by delegate ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sent delegations retrieved successfully',
  })
  async getSentDelegations(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: boolean,
    @Query('isRevoked') isRevoked?: boolean,
    @Query('delegateId') delegateId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetDelegationsFilterDto = {
      isActive,
      isRevoked,
      delegateId,
    };

    return this.delegationService.getSentDelegations(
      user.id,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Get('received')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get delegations received by current user',
    description: 'Retrieves delegations where current user is the delegate',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isRevoked',
    required: false,
    type: Boolean,
    description: 'Filter by revoked status',
  })
  @ApiQuery({
    name: 'delegatorId',
    required: false,
    description: 'Filter by delegator ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Received delegations retrieved successfully',
  })
  async getReceivedDelegations(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: boolean,
    @Query('isRevoked') isRevoked?: boolean,
    @Query('delegatorId') delegatorId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetDelegationsFilterDto = {
      isActive,
      isRevoked,
      delegatorId,
    };

    return this.delegationService.getReceivedDelegations(
      user.id,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Get('active')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all active delegations',
    description: 'Retrieves all currently active delegations (admin view)',
  })
  @ApiQuery({
    name: 'delegatorId',
    required: false,
    description: 'Filter by delegator ID',
  })
  @ApiQuery({
    name: 'delegateId',
    required: false,
    description: 'Filter by delegate ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active delegations retrieved successfully',
  })
  async getActiveDelegations(
    @Query('delegatorId') delegatorId?: string,
    @Query('delegateId') delegateId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetDelegationsFilterDto = {
      delegatorId,
      delegateId,
    };

    return this.delegationService.getActiveDelegations(
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Get('expiring')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get delegations expiring soon',
    description:
      'Retrieves delegations expiring within specified days (default 7)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Days threshold (default: 7)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expiring delegations retrieved successfully',
  })
  async getExpiringDelegations(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.delegationService.getExpiringDelegations(days || 7);
  }

  @Get(':id')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get delegation details' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegation details retrieved successfully',
  })
  async getDelegationById(@Param('id') id: string) {
    return this.delegationService.getDelegationById(id);
  }

  @Put(':id/revoke')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'permission_delegation.revoke',
    resource: 'permission_delegation',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({
    summary: 'Revoke delegation early',
    description: 'Revoke an active delegation before its expiration date',
  })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegation revoked successfully',
  })
  async revokeDelegation(
    @Param('id') id: string,
    @Body() dto: RevokeDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.revokeDelegation(id, dto, user.id);
  }

  @Put(':id/extend')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit(
    'permission_delegation.extend',
    'permission_delegation',
  )
  @ApiOperation({
    summary: 'Extend delegation expiration',
    description: 'Extend the expiration date of an active delegation',
  })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegation extended successfully',
  })
  async extendDelegation(
    @Param('id') id: string,
    @Body() dto: ExtendDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.extendDelegation(id, dto, user.id);
  }

  @Get('users/:userId/summary')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get delegation summary for user',
    description: 'Retrieves delegation statistics for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegation summary retrieved successfully',
  })
  async getUserDelegationSummary(@Param('userId') userId: string) {
    return this.delegationService.getUserDelegationSummary(userId);
  }
}
