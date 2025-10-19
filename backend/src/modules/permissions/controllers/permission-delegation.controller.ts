import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission } from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { PermissionDelegationService } from '../services/permission-delegation.service';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permission Delegation')
@ApiBearerAuth()
@Controller('permission-delegation')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionDelegationController {
  constructor(
    private readonly delegationService: PermissionDelegationService,
  ) {}

  @Post('delegate')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Delegate permissions to another user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions delegated successfully',
  })
  async delegatePermissions(@Body() dto: any, @CurrentUser() user: any) {
    return this.delegationService.delegatePermissions(
      user.id,
      dto.delegateId,
      dto.permissions,
      dto.reason,
      dto.validUntil,
    );
  }

  @Post(':id/revoke')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Revoke delegated permissions' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Delegation revoked successfully',
  })
  async revokeDelegation(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    await this.delegationService.revokeDelegation(id, user.id, dto.reason);
  }

  @Get('my-delegations')
  @ApiOperation({ summary: 'Get my delegations (as delegator)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegations retrieved successfully',
  })
  async getMyDelegations(@CurrentUser() user: any) {
    return this.delegationService.getUserDelegations(user.id, 'delegator');
  }

  @Get('delegated-to-me')
  @ApiOperation({ summary: 'Get permissions delegated to me' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegations retrieved successfully',
  })
  async getDelegatedToMe(@CurrentUser() user: any) {
    return this.delegationService.getUserDelegations(user.id, 'delegate');
  }
}
