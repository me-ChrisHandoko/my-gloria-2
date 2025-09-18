import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission } from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { PermissionTemplatesService } from '../services/permission-templates.service';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permission Templates')
@ApiBearerAuth()
@Controller('api/v1/permission-templates')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionTemplatesController {
  constructor(private readonly templatesService: PermissionTemplatesService) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create permission template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  async createTemplate(@Body() dto: any, @CurrentUser() user: any) {
    return this.templatesService.createTemplate(
      dto.code,
      dto.name,
      dto.category,
      dto.permissions,
      dto.moduleAccess,
      dto.description,
      user.id,
    );
  }

  @Get()
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all permission templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async getTemplates(@Query('category') category?: string) {
    return this.templatesService.findAllTemplates(category);
  }

  @Post('apply')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Apply permission template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template applied successfully',
  })
  async applyTemplate(@Body() dto: any, @CurrentUser() user: any) {
    return this.templatesService.applyTemplate(
      dto.templateId,
      dto.targetType,
      dto.targetId,
      user.id,
    );
  }
}
