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
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of notifications',
  })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(user.id, {
      page,
      limit,
      unreadOnly,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns notification details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
  })
  async getNotification(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.getNotificationById(user.id, id);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Notification marked as read',
  })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(user.id, id);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Notification deleted',
  })
  async deleteNotification(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(user.id, id);
  }

  @Get('count/unread')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns unread count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }
}
