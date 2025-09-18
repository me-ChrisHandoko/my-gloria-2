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
import { FeatureFlagsService } from './feature-flags.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { EvaluateFeatureFlagDto } from './dto/evaluate-feature-flag.dto';
import { ClerkAuthGuard } from '../../core/auth/guards/clerk-auth.guard';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@Controller('api/v1/feature-flags')
@UseGuards(ClerkAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Post()
  @RequirePermission('MANAGE_FEATURE_FLAGS')
  create(@Body() createFeatureFlagDto: CreateFeatureFlagDto) {
    return this.featureFlagsService.create(createFeatureFlagDto);
  }

  @Get()
  findAll(
    @Query('enabled') enabled?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.featureFlagsService.findAll({
      enabled:
        enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      type,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featureFlagsService.findOne(id);
  }

  @Get('key/:key')
  findByKey(@Param('key') key: string) {
    return this.featureFlagsService.findByKey(key);
  }

  @Patch(':id')
  @RequirePermission('MANAGE_FEATURE_FLAGS')
  update(
    @Param('id') id: string,
    @Body() updateFeatureFlagDto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagsService.update(id, updateFeatureFlagDto);
  }

  @Post(':id/toggle')
  @RequirePermission('MANAGE_FEATURE_FLAGS')
  @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string) {
    return this.featureFlagsService.toggle(id);
  }

  @Delete(':id')
  @RequirePermission('MANAGE_FEATURE_FLAGS')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.featureFlagsService.delete(id);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  evaluate(
    @Body() evaluateDto: EvaluateFeatureFlagDto,
    @CurrentUser() user?: any,
  ) {
    // Enrich evaluation context with current user info
    if (user) {
      evaluateDto.userId = evaluateDto.userId || user.id;
      evaluateDto.userRoles = evaluateDto.userRoles || user.roles;
      evaluateDto.schoolId = evaluateDto.schoolId || user.schoolId;
    }

    return this.featureFlagsService.evaluate(evaluateDto);
  }

  @Post('evaluate-bulk')
  @HttpCode(HttpStatus.OK)
  evaluateBulk(
    @Body() body: { flagKeys: string[]; context: EvaluateFeatureFlagDto },
    @CurrentUser() user?: any,
  ) {
    // Enrich evaluation context with current user info
    if (user) {
      body.context.userId = body.context.userId || user.id;
      body.context.userRoles = body.context.userRoles || user.roles;
      body.context.schoolId = body.context.schoolId || user.schoolId;
    }

    return this.featureFlagsService.evaluateBulk(body.flagKeys, body.context);
  }

  @Get(':id/statistics')
  @RequirePermission('VIEW_FEATURE_FLAGS')
  getStatistics(@Param('id') id: string) {
    return this.featureFlagsService.getStatistics(id);
  }

  @Get('statistics/all')
  @RequirePermission('VIEW_FEATURE_FLAGS')
  getAllStatistics() {
    return this.featureFlagsService.getStatistics();
  }
}
