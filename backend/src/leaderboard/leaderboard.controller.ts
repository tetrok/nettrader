/**
 * NetTrader 2 — Contrôleur REST des Classements
 *
 * Usage:
 *   Fournit les classements des joueurs et des équipes (/api/leaderboard).
 *
 * Logique & Fonctionnement:
 *   - getPlayers() : classement général individuel selon la valorisation totale et la progression relative.
 *   - getTeams() : palmarès des équipes de traders.
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('players')
  @ApiOperation({ summary: 'Classement général des joueurs' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'period', required: false })
  async getPlayers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('period') period?: string,
  ) {
    return this.leaderboardService.getPlayers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
      search || '',
      period || '',
    );
  }

  @Get('teams')
  @ApiOperation({ summary: 'Classement des équipes' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'period', required: false })
  async getTeams(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('period') period?: string,
  ) {
    return this.leaderboardService.getTeams(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
      search || '',
      period || '',
    );
  }
}
