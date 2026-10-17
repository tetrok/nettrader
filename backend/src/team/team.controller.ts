/**
 * NetTrader 2 — Contrôleur REST des Équipes (Groupes)
 *
 * Usage:
 *   Expose les routes /api/teams pour la gestion collaborative des équipes de trading.
 *
 * Logique & Fonctionnement:
 *   - getMyTeam() / getTeam() : consultation de la fiche équipe et de ses membres.
 *   - createTeam() / updateTeam() : création et mise à jour d'équipe soumises à modération.
 *   - joinTeam() / leaveTeam() : adhésion ou départ d'une équipe.
 *   - getMyInvitations() / rejectInvitation() : gestion des invitations reçues.
 *   - searchCandidates() / invitePlayer() / cancelInvitation() : recrutement par le capitaine.
 *   - kickMember() : exclusion d'un membre par le capitaine.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
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

  @Get('my-team')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut et équipe du joueur connecté' })
  async getMyTeam(@CurrentUser() user: User) {
    return this.teamService.getMyTeam(user.id);
  }

  @Get('invitations')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des invitations reçues par le joueur' })
  async getMyInvitations(@CurrentUser() user: User) {
    return this.teamService.getMyInvitations(user.id);
  }

  @Post('invitations/:id/reject')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refuser une invitation reçue' })
  async rejectInvitation(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.rejectInvitation(user.id, id);
  }

  @Post('leave')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quitter son équipe' })
  async leaveTeam(@CurrentUser() user: User) {
    return this.teamService.leaveTeam(user.id);
  }

  @Get(':id/candidates')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechercher des candidats à inviter' })
  async searchCandidates(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query('q') query?: string,
  ) {
    return this.teamService.searchCandidates(user.id, id, query || '');
  }

  @Post(':id/invitations')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inviter un joueur dans son équipe' })
  async invitePlayer(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) targetUserId: number,
  ) {
    return this.teamService.invitePlayer(user.id, id, targetUserId);
  }

  @Delete(':id/invitations/:targetUserId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler une invitation envoyée' })
  async cancelInvitation(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    return this.teamService.cancelInvitation(user.id, id, targetUserId);
  }

  @Delete(':id/members/:targetUserId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exclure un membre de l\'équipe' })
  async kickMember(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    return this.teamService.kickMember(user.id, id, targetUserId);
  }

  @Post(':id/join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejoindre une équipe suite à invitation' })
  async joinTeam(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.joinTeam(user.id, id);
  }

  @Post(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier les informations d\'une équipe' })
  async updateTeam(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamService.updateTeam(user.id, id, dto);
  }

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
}
