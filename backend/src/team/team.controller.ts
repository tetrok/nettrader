/**
 * NetTrader 2 — Contrôleur REST des Équipes (Groupes)
 *
 * Usage:
 *   Expose les routes /api/teams pour la gestion collaborative des équipes de trading.
 *
 * Logique & Fonctionnement:
 *   - getMyTeam() / getTeam() : consultation de la fiche équipe et de ses membres.
 *   - createTeam() : création d'une nouvelle équipe avec tag unique.
 *   - joinTeam() / leaveTeam() : adhésion ou départ d'une équipe.
 *   - approveMember() / rejectMember() : gestion des demandes par le capitaine.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Détails et composition d\'une équipe' })
  async getTeam(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.getTeam(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Création d\'une équipe' })
  async createTeam(@CurrentUser() user: User, @Body() dto: CreateTeamDto) {
    return this.teamService.createTeam(user.id, dto);
  }

  @Post(':id/join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejoindre une équipe' })
  async joinTeam(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.joinTeam(user.id, id);
  }

  @Post('leave')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quitter son équipe' })
  async leaveTeam(@CurrentUser() user: User) {
    return this.teamService.leaveTeam(user.id);
  }
}
