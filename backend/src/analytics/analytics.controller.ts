/**
 * NetTrader 2 — Contrôleur Public de Collecte d'Analytique (/api/analytics)
 *
 * Usage:
 *   Reçoit les paquets d'événements et de crashs envoyés par les clients frontend
 *   (via fetch ou navigator.sendBeacon).
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService, CollectPayload } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('collect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Collecte un lot d\'événements d\'usage et d\'erreurs client' })
  async collect(@Body() payload: CollectPayload) {
    return this.analyticsService.collect(payload);
  }
}
