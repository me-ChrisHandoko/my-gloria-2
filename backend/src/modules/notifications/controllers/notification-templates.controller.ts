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
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { NotificationType } from '@prisma/client';
import {
  RequiredPermission,
  PermissionAction,
} from '@/core/auth/decorators/permissions.decorator';
import { NotificationTemplatesService } from '../services/notification-templates.service';

@ApiTags('Notification Templates')
@ApiBearerAuth()
@Controller('api/v1/notification-templates')
@UseGuards(ClerkAuthGuard)
export class NotificationTemplatesController {
  constructor(
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notification templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of templates',
  })
  @RequiredPermission('notification_templates', PermissionAction.READ)
  async getTemplates(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
  ) {
    return this.templatesService.getTemplates({
      page,
      limit,
      type: type as NotificationType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns template details',
  })
  @RequiredPermission('notification_templates', PermissionAction.READ)
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplateById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  @RequiredPermission('notification_templates', PermissionAction.CREATE)
  async createTemplate(@Body() template: any) {
    return this.templatesService.createTemplate(template);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
  })
  @RequiredPermission('notification_templates', PermissionAction.UPDATE)
  async updateTemplate(@Param('id') id: string, @Body() template: any) {
    return this.templatesService.updateTemplate(id, template);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Template deleted successfully',
  })
  @RequiredPermission('notification_templates', PermissionAction.DELETE)
  async deleteTemplate(@Param('id') id: string) {
    await this.templatesService.deleteTemplate(id);
  }
}
