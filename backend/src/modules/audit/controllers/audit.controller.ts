import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  StreamableFile,
  Header,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import {
  RequiredPermission,
  PermissionAction,
} from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { AuditLogService } from '../services/audit-log.service';
import { AuditReportingService } from '../services/audit-reporting.service';
import { AuditComplianceService } from '../services/audit-compliance.service';
import { AuditRetentionService } from '../services/audit-retention.service';
import { AuditAction } from '@prisma/client';
import { SkipAudit } from '../interceptors/audit.interceptor';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
@UseGuards(ClerkAuthGuard)
export class AuditController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditReportingService: AuditReportingService,
    private readonly auditComplianceService: AuditComplianceService,
    private readonly auditRetentionService: AuditRetentionService,
  ) {}

  /**
   * Query audit logs
   */
  @Get('logs')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @SkipAudit()
  async queryLogs(
    @Query('actorId') actorId?: string,
    @Query('actorProfileId') actorProfileId?: string,
    @Query('module') module?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.queryLogs({
      actorId,
      actorProfileId,
      module,
      action,
      entityType,
      entityId,
      targetUserId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Get entity history
   */
  @Get('entity/:entityType/:entityId')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get entity audit history' })
  @SkipAudit()
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.getEntityHistory(entityType, entityId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Get user activity
   */
  @Get('user/:userProfileId')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user audit activity' })
  @SkipAudit()
  async getUserActivity(
    @Param('userProfileId') userProfileId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditLogService.getUserActivity(userProfileId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  /**
   * Get audit statistics
   */
  @Get('statistics')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get audit statistics' })
  @SkipAudit()
  async getStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('module') module?: string,
  ) {
    return this.auditLogService.getStatistics({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      module,
    });
  }

  /**
   * Generate activity report
   */
  @Post('reports/activity')
  @RequiredPermission('audit', PermissionAction.EXPORT)
  @ApiOperation({ summary: 'Generate activity report' })
  @HttpCode(HttpStatus.OK)
  async generateActivityReport(
    @Body()
    body: {
      startDate: string;
      endDate: string;
      modules?: string[];
      actions?: AuditAction[];
      users?: string[];
      entityTypes?: string[];
      format?: 'json' | 'csv' | 'excel' | 'pdf';
      includeDetails?: boolean;
      groupBy?: 'user' | 'module' | 'action' | 'date';
    },
    @Res() res: Response,
  ) {
    const report = await this.auditReportingService.generateActivityReport(
      {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        modules: body.modules,
        actions: body.actions,
        users: body.users,
        entityTypes: body.entityTypes,
      },
      {
        format: body.format || 'json',
        includeDetails: body.includeDetails,
        groupBy: body.groupBy,
      },
    );

    // Set appropriate headers based on format
    switch (body.format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=audit-report.csv',
        );
        res.send(report);
        break;
      case 'excel':
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=audit-report.xlsx',
        );
        res.send(report);
        break;
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename=audit-report.pdf',
        );
        res.send(report);
        break;
      default:
        res.json(report);
    }
  }

  /**
   * Generate user activity report
   */
  @Get('reports/user/:userProfileId')
  @RequiredPermission('audit', PermissionAction.EXPORT)
  @ApiOperation({ summary: 'Generate user activity report' })
  @SkipAudit()
  async generateUserActivityReport(
    @Param('userProfileId') userProfileId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    return this.auditReportingService.generateUserActivityReport(
      userProfileId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    );
  }

  /**
   * Generate security report
   */
  @Post('reports/security')
  @RequiredPermission('audit', PermissionAction.EXPORT)
  @ApiOperation({ summary: 'Generate security audit report' })
  @HttpCode(HttpStatus.OK)
  async generateSecurityReport(
    @Body() body: { startDate: string; endDate: string; modules?: string[] },
  ) {
    return this.auditReportingService.generateSecurityReport({
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      modules: body.modules,
    });
  }

  /**
   * Generate compliance report
   */
  @Post('reports/compliance')
  @RequiredPermission('audit', PermissionAction.EXPORT)
  @ApiOperation({ summary: 'Generate compliance report' })
  @HttpCode(HttpStatus.OK)
  async generateComplianceReport(
    @Body() body: { startDate: string; endDate: string; modules?: string[] },
  ) {
    return this.auditReportingService.generateComplianceReport({
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      modules: body.modules,
    });
  }

  /**
   * Run compliance check
   */
  @Post('compliance/check')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Run compliance check' })
  @HttpCode(HttpStatus.OK)
  async runComplianceCheck(
    @Body() body: { startDate: string; endDate: string; ruleIds?: string[] },
  ) {
    return this.auditComplianceService.runComplianceCheck(
      new Date(body.startDate),
      new Date(body.endDate),
      body.ruleIds,
    );
  }

  /**
   * Get compliance status
   */
  @Get('compliance/status')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get compliance status' })
  @SkipAudit()
  async getComplianceStatus() {
    return this.auditComplianceService.getComplianceStatus();
  }

  /**
   * Check retention compliance
   */
  @Get('compliance/retention')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Check retention compliance' })
  @SkipAudit()
  async checkRetentionCompliance() {
    return this.auditComplianceService.checkRetentionCompliance();
  }

  /**
   * Validate audit trail
   */
  @Get('compliance/validate/:entityType/:entityId')
  @RequiredPermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Validate audit trail integrity' })
  @SkipAudit()
  async validateAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditComplianceService.validateAuditTrail(entityType, entityId);
  }

  /**
   * Get retention statistics
   */
  @Get('retention/statistics')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Get retention statistics' })
  @SkipAudit()
  async getRetentionStatistics() {
    return this.auditRetentionService.getRetentionStatistics();
  }

  /**
   * Manual retention trigger
   */
  @Post('retention/manual')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Manually trigger retention policy' })
  @HttpCode(HttpStatus.OK)
  async manualRetention(
    @Body()
    body: {
      entityType?: string;
      action?: AuditAction;
      olderThanDays: number;
      dryRun?: boolean;
    },
  ) {
    if (!body.olderThanDays || body.olderThanDays < 1) {
      throw new BadRequestException('Invalid retention period');
    }

    return this.auditRetentionService.manualRetention(body);
  }

  /**
   * Export logs before deletion
   */
  @Post('retention/export')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Export logs before deletion' })
  @HttpCode(HttpStatus.OK)
  async exportLogsBeforeDeletion(
    @Body()
    body: {
      cutoffDate: string;
      format?: 'json' | 'csv';
    },
    @Res() res: Response,
  ) {
    const buffer = await this.auditRetentionService.exportLogsBeforeDeletion(
      new Date(body.cutoffDate),
      body.format || 'json',
    );

    const filename = `audit-export-${new Date().toISOString().split('T')[0]}.${
      body.format || 'json'
    }`;

    res.setHeader(
      'Content-Type',
      body.format === 'csv' ? 'text/csv' : 'application/json',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  /**
   * Get next retention run
   */
  @Get('retention/next-run')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Get next scheduled retention run' })
  @SkipAudit()
  async getNextRetentionRun() {
    return {
      nextRun: this.auditRetentionService.getNextRetentionRun(),
    };
  }

  /**
   * Apply retention policies manually
   */
  @Post('retention/apply')
  @RequiredPermission('audit', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Apply retention policies manually' })
  @HttpCode(HttpStatus.OK)
  async applyRetentionPolicies() {
    return this.auditRetentionService.applyRetentionPolicies();
  }
}
