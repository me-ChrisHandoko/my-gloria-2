import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PermissionTemplateService } from '../services/permission-template.service';
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  ApplyTemplateDto,
  RevokeTemplateApplicationDto,
  GetTemplatesFilterDto,
  TemplateTargetType,
} from '../dto/permission-template.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permission Templates')
@ApiBearerAuth()
@Controller('permission-templates')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionTemplateController {
  constructor(
    private readonly templateService: PermissionTemplateService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit(
    'permission_template.create',
    'permission_template',
  )
  @ApiOperation({ summary: 'Create permission template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  async createTemplate(
    @Body() dto: CreatePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.createTemplate(dto, user.id);
  }

  @Get()
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get permission templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isSystem', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async getTemplates(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isSystem') isSystem?: boolean,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetTemplatesFilterDto = {
      category,
      isActive,
      isSystem,
      search,
    };

    return this.templateService.getTemplates(filters, page || 1, limit || 10);
  }

  @Get('categories')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get template categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    return this.templateService.getTemplateCategories();
  }

  @Get(':id')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get template details' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
  })
  async getTemplateById(@Param('id') id: string) {
    return this.templateService.getTemplateById(id);
  }

  @Put(':id')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit(
    'permission_template.update',
    'permission_template',
  )
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.updateTemplate(id, dto, user.id);
  }

  @Delete(':id')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'permission_template.delete',
    resource: 'permission_template',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deleted successfully',
  })
  async deleteTemplate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templateService.deleteTemplate(id, user.id);
  }

  @Post(':id/apply')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({
    action: 'permission_template.apply',
    resource: 'template_application',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Apply template to target' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template applied successfully',
  })
  async applyTemplate(
    @Param('id') id: string,
    @Body() dto: ApplyTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.applyTemplate(id, dto, user.id);
  }

  @Post(':id/preview')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Preview template application' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template preview generated',
  })
  async previewTemplate(
    @Param('id') id: string,
    @Body() body: { targetType: TemplateTargetType; targetId: string },
  ) {
    return this.templateService.previewTemplate(
      id,
      body.targetType,
      body.targetId,
    );
  }

  @Get(':id/applications')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get template applications' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiQuery({ name: 'targetType', required: false })
  @ApiQuery({ name: 'isRevoked', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
  })
  async getTemplateApplications(
    @Param('id') id: string,
    @Query('targetType') targetType?: string,
    @Query('isRevoked') isRevoked?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters = { targetType, isRevoked };
    return this.templateService.getTemplateApplications(
      id,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Post(':templateId/applications/:appId/revoke')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'template_application.revoke',
    resource: 'template_application',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Revoke template application' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiParam({ name: 'appId', description: 'Application ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application revoked successfully',
  })
  async revokeTemplateApplication(
    @Param('appId') appId: string,
    @Body() dto: RevokeTemplateApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.revokeTemplateApplication(appId, dto, user.id);
  }

  @Post(':id/version')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit(
    'permission_template.version',
    'permission_template',
  )
  @ApiOperation({ summary: 'Create new template version' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template version incremented',
  })
  async createTemplateVersion(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.templateService.createTemplateVersion(id, user.id);
  }
}
