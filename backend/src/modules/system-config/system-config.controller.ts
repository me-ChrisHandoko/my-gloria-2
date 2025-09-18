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
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { ClerkAuthGuard } from '../../core/auth/guards/clerk-auth.guard';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@Controller('api/v1/system-config')
@UseGuards(ClerkAuthGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Post()
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  create(
    @Body() createSystemConfigDto: CreateSystemConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.systemConfigService.create(createSystemConfigDto, user.id);
  }

  @Get()
  @RequirePermission('VIEW_SYSTEM_CONFIG')
  findAll(
    @Query('category') category?: string,
    @Query('isPublic') isPublic?: string,
    @Query('search') search?: string,
    @Query('includeEncrypted') includeEncrypted?: string,
  ) {
    return this.systemConfigService.findAll({
      category,
      isPublic:
        isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      search,
      includeEncrypted: includeEncrypted === 'true',
    });
  }

  @Get('public')
  getPublicConfigs() {
    return this.systemConfigService.getPublicConfigs();
  }

  @Get('export')
  @RequirePermission('EXPORT_SYSTEM_CONFIG')
  exportConfigs(@Query('category') category?: string) {
    return this.systemConfigService.exportConfigs(category);
  }

  @Get(':id')
  @RequirePermission('VIEW_SYSTEM_CONFIG')
  findOne(@Param('id') id: string) {
    return this.systemConfigService.findOne(id);
  }

  @Get('key/:key')
  @RequirePermission('VIEW_SYSTEM_CONFIG')
  findByKey(@Param('key') key: string, @Query('decrypt') decrypt?: string) {
    return this.systemConfigService.findByKey(key, decrypt === 'true');
  }

  @Get('value/:key')
  @RequirePermission('VIEW_SYSTEM_CONFIG')
  getValue(@Param('key') key: string, @Query('default') defaultValue?: string) {
    return this.systemConfigService.getValue(key, defaultValue);
  }

  @Get(':id/history')
  @RequirePermission('VIEW_SYSTEM_CONFIG')
  getHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.systemConfigService.getHistory(
      id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Patch(':id')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  update(
    @Param('id') id: string,
    @Body() updateSystemConfigDto: UpdateSystemConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.systemConfigService.update(id, updateSystemConfigDto, user.id);
  }

  @Patch('key/:key')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  updateByKey(
    @Param('key') key: string,
    @Body() body: { value: any; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.systemConfigService.updateByKey(
      key,
      body.value,
      user.id,
      body.reason,
    );
  }

  @Post('bulk-update')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  @HttpCode(HttpStatus.OK)
  bulkUpdate(
    @Body()
    body: { updates: Array<{ key: string; value: any }>; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.systemConfigService.bulkUpdate(
      body.updates,
      user.id,
      body.reason,
    );
  }

  @Post('import')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  @HttpCode(HttpStatus.OK)
  importConfigs(
    @Body() body: { configs: Record<string, any>; overwrite?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.systemConfigService.importConfigs(
      body.configs,
      user.id,
      body.overwrite,
    );
  }

  @Post('refresh-cache')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  @HttpCode(HttpStatus.NO_CONTENT)
  refreshCache() {
    return this.systemConfigService.refreshCache();
  }

  @Delete(':id')
  @RequirePermission('MANAGE_SYSTEM_CONFIG')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.systemConfigService.delete(id, user.id);
  }
}
