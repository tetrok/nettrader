/**
 * NetTrader 2 — Contrôleur Administrateur d'Analytique (/api/admin/analytics)
 *
 * Usage:
 *   Fournit les données de synthèse, statistiques de trading et journal des problèmes
 *   à l'interface d'administration NetTrader 2.
 */

import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(AuthGuard, AdminGuard)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Synthèse des usages, pratiques et problèmes utilisateurs' })
  async getOverview(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getOverview(days);
  }
}
