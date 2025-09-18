import {
  Controller,
  Get,
  Put,
  Body,
  Param,
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
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { NotificationChannel } from '@prisma/client';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('api/v1/notification-preferences')
@UseGuards(ClerkAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns notification preferences',
  })
  async getPreferences(@CurrentUser() user: any) {
    return this.preferencesService.getUserPreferences(user.id);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences updated successfully',
  })
  async updatePreferences(@CurrentUser() user: any, @Body() preferences: any) {
    return this.preferencesService.updateUserPreferences(user.id, preferences);
  }

  @Put('channel/:channel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Toggle notification channel' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Channel toggled successfully',
  })
  async toggleChannel(
    @CurrentUser() user: any,
    @Param('channel') channel: string,
    @Body('enabled') enabled: boolean,
  ) {
    await this.preferencesService.toggleChannel(
      user.id,
      channel as NotificationChannel,
      enabled,
    );
  }
}
