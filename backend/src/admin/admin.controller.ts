/**
 * NetTrader 2 — Contrôleur REST d'Administration & Supervision Système
 *
 * Usage:
 *   Regroupe tous les endpoints de gestion administrative réservés aux administrateurs (/api/admin).
 *
 * Logique & Fonctionnement:
 *   - getDashboardStats() : indicateurs clés d'activité et synthèse du système.
 *   - Catalogue d'actions : listing, création, mise à jour, archivage, split et suppression de titres.
 *   - Market Sync Monitor : KPIs du fetcher, listing des cotations en échec, réinitialisation d'erreurs et bascule de suivi.
 *   - Modération forum : suppression et déplacement de sujets, édition modératrice de posts.
 *   - Déclenchement de jobs d'arrière-plan : exécution manuelle de checkscore ou executeorder.
 */

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
  ParseIntPipe,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import * as fs from 'fs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '../entities/user.entity';
import { AdminDashboardService } from './admin-dashboard.service';
import { MarketSyncService } from './market-sync.service';
import { AdminStockService } from './admin-stock.service';
import { AdminForumService } from './admin-forum.service';
import { AdminJobsService } from './admin-jobs.service';
import { AdminBackupService } from './admin-backup.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly marketSyncService: MarketSyncService,
    private readonly stockService: AdminStockService,
    private readonly forumService: AdminForumService,
    private readonly jobsService: AdminJobsService,
    private readonly backupService: AdminBackupService,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard & Joueurs
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord administrateur (KPIs)' })
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('players')
  @ApiOperation({ summary: 'Liste paginée des joueurs pour modération' })
  async getPlayers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.dashboardService.getPlayers(page, limit, search);
  }

  @Get('teams/pending')
  @ApiOperation({ summary: 'Liste des demandes d’équipes en attente' })
  async getPendingTeams() {
    return this.dashboardService.getPendingTeams();
  }

  @Post('teams/pending/:id/review')
  @ApiOperation({ summary: 'Approuver ou rejeter une demande d’équipe' })
  async reviewPendingTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: string; comment?: string },
  ) {
    return this.dashboardService.reviewPendingTeam(id, body.action, body.comment);
  }

  @Post('jobs/execute-orders')
  @ApiOperation({ summary: 'Déclencher manuellement le job d’exécution des ordres' })
  async executeOrdersJob() {
    await this.jobsService.executeOrdersJob();
    return { message: "L'algorithme d'exécution des ordres a été exécuté." };
  }

  // ---------------------------------------------------------------------------
  // Suivi des Cotations & Marché (Market Sync)
  // ---------------------------------------------------------------------------

  @Get('market-sync/overview')
  @ApiOperation({ summary: 'Vue d’ensemble du monitoring des cotations' })
  async getMarketSyncOverview() {
    return this.marketSyncService.getOverview();
  }

  @Get('market-sync/stocks')
  @ApiOperation({ summary: 'Liste des valeurs pour monitoring de la cotation' })
  async getMarketSyncStocks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.marketSyncService.getStocks({ page, limit, search, status, sort, order });
  }

  @Post('market-sync/stocks/:codesico/toggle-track')
  @ApiOperation({ summary: 'Activer / désactiver le suivi d’une valeur' })
  async toggleStockTracking(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.marketSyncService.toggleTracking(codesico);
  }

  @Post('market-sync/stocks/:codesico/reset-errors')
  @ApiOperation({ summary: 'Réinitialiser les erreurs pour une valeur' })
  async resetStockErrors(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.marketSyncService.resetStockErrors(codesico);
  }

  @Post('market-sync/reset-all-errors')
  @ApiOperation({ summary: 'Réinitialiser les erreurs pour toutes les valeurs' })
  async resetAllStockErrors() {
    await this.marketSyncService.resetAllStockErrors();
    return { message: 'Tous les compteurs d’échecs ont été réinitialisés.' };
  }

  @Post('market-sync/force-sync')
  @ApiOperation({ summary: 'Forcer la synchronisation globale des cotations' })
  async forceMarketSync() {
    return this.marketSyncService.syncQuotes();
  }

  @Post('market-sync/stocks/:codesico/force-sync')
  @ApiOperation({ summary: 'Forcer la synchronisation pour une seule valeur' })
  async forceStockSync(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.marketSyncService.syncQuotes(codesico);
  }

  // ---------------------------------------------------------------------------
  // Catalogue & Gestion des Actions
  // ---------------------------------------------------------------------------

  @Get('stocks')
  @ApiOperation({ summary: 'Catalogue complet des actions avec filtres' })
  async getAdminStocks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sectorId') sectorId?: number,
    @Query('marketId') marketId?: number,
    @Query('authBuy') authBuy?: string,
    @Query('isTracked') isTracked?: string,
    @Query('isArchived') isArchived?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.stockService.getAdminStocks({
      page,
      limit,
      search,
      sectorId,
      marketId,
      authBuy,
      isTracked,
      isArchived,
      sort,
      order,
    });
  }

  @Get('stocks/metadata')
  @ApiOperation({ summary: 'Métadonnées des secteurs et marchés' })
  async getStockMetadata() {
    return this.stockService.getStockMetadata();
  }

  @Post('stocks')
  @ApiOperation({ summary: 'Créer une nouvelle action en base' })
  async createStock(@Body() payload: any) {
    return this.stockService.createStock(payload);
  }

  @Put('stocks/:codesico')
  @ApiOperation({ summary: 'Mettre à jour une action existante' })
  async updateStock(
    @Param('codesico', ParseIntPipe) codesico: number,
    @Body() payload: any,
  ) {
    return this.stockService.updateStock(codesico, payload);
  }

  @Delete('stocks/:codesico')
  @ApiOperation({ summary: 'Supprimer une action du catalogue' })
  async deleteStock(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.stockService.deleteStock(codesico);
  }

  @Post('stocks/:codesico/toggle-buy')
  @ApiOperation({ summary: 'Activer / désactiver l’autorisation d’achat' })
  async toggleStockAuthBuy(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.stockService.toggleStockAuthBuy(codesico);
  }

  @Post('stocks/split')
  @ApiOperation({ summary: 'Opération sur titre : Fractionnement ou Regroupement' })
  async splitStock(
    @Body() payload: { codesico: number; type: 'multiplier' | 'diviser'; factor: number },
  ) {
    return this.stockService.splitStock(payload);
  }

  @Post('stocks/:codesico/archive')
  @ApiOperation({ summary: 'Archiver une action et liquider les positions' })
  async archiveStock(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.stockService.archiveStock(codesico);
  }

  @Post('stocks/:codesico/unarchive')
  @ApiOperation({ summary: 'Désarchiver une action' })
  async unarchiveStock(@Param('codesico', ParseIntPipe) codesico: number) {
    return this.stockService.unarchiveStock(codesico);
  }

  @Post('stocks/archive-bulk')
  @ApiOperation({ summary: 'Archivage en masse d’actions' })
  async archiveBulkStocks(@Body() body: { codes: number[] }) {
    return this.stockService.archiveBulkStocks(body.codes);
  }

  @Post('stocks/delete-bulk')
  @ApiOperation({ summary: 'Suppression en masse d’actions (sécurisée par mot de passe)' })
  async deleteBulkStocks(
    @Req() req: any,
    @Body() body: { codes: number[]; adminPassword: string },
  ) {
    const adminUser = req.user as User;
    return this.stockService.deleteBulkStocks(body.codes, body.adminPassword, adminUser);
  }

  // ---------------------------------------------------------------------------
  // Découverte & Import Yahoo Finance
  // ---------------------------------------------------------------------------

  @Get('yahoo/discover')
  @ApiOperation({ summary: 'Recherche et découverte d’actions Euronext Paris' })
  async discoverYahooMarket(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string,
  ) {
    return this.stockService.discoverYahooMarket({ limit, offset, search });
  }

  @Post('yahoo/import')
  @ApiOperation({ summary: 'Importer des actions Yahoo Finance dans le catalogue' })
  async importYahooStocks(@Body() body: { items: any[] }) {
    return this.stockService.importYahooStocks(body.items);
  }

  // ---------------------------------------------------------------------------
  // Administration du Forum
  // ---------------------------------------------------------------------------

  @Get('forum/sections')
  @ApiOperation({ summary: 'Liste des sections du forum' })
  async getForumSections() {
    return this.forumService.getForumSections();
  }

  @Post('forum/sections')
  @ApiOperation({ summary: 'Créer une section de forum' })
  async createForumSection(@Body() body: { name: string }) {
    return this.forumService.createForumSection(body.name);
  }

  @Get('forum/forums')
  @ApiOperation({ summary: 'Liste des rubriques de forum' })
  async getAdminForums() {
    return this.forumService.getAdminForums();
  }

  @Post('forum/forums')
  @ApiOperation({ summary: 'Créer une rubrique de forum' })
  async createAdminForum(
    @Body()
    body: {
      name: string;
      description: string;
      sectionId: number;
      authread: string;
      authwrite: string;
    },
  ) {
    return this.forumService.createAdminForum(body);
  }

  @Put('forum/forums/:id')
  @ApiOperation({ summary: 'Modifier une rubrique de forum' })
  async updateAdminForum(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name: string;
      description: string;
      sectionId: number;
      authread: string;
      authwrite: string;
    },
  ) {
    await this.forumService.updateAdminForum(id, body);
    return { message: 'Forum mis à jour avec succès.' };
  }

  @Delete('forum/forums/:id')
  @ApiOperation({ summary: 'Supprimer une rubrique de forum et son contenu' })
  async deleteAdminForum(@Param('id', ParseIntPipe) id: number) {
    await this.forumService.deleteAdminForum(id);
    return { message: 'Forum supprimé avec succès.' };
  }

  @Post('forum/forums/:id/sync')
  @ApiOperation({ summary: 'Resynchroniser les compteurs d’un forum' })
  async syncAdminForum(@Param('id', ParseIntPipe) id: number) {
    await this.forumService.syncAdminForum(id);
    return { message: 'Les compteurs du forum ont été resynchronisés.' };
  }

  @Get('forum/topics')
  @ApiOperation({ summary: 'Liste des sujets pour modération' })
  async getAdminTopics(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('forumId') forumId?: number,
    @Query('search') search?: string,
  ) {
    return this.forumService.getAdminTopics(page, limit, forumId, search);
  }

  @Put('forum/topics/:id')
  @ApiOperation({ summary: 'Modifier un sujet (titre ou déplacement)' })
  async updateAdminTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; forumId?: number },
  ) {
    await this.forumService.updateAdminTopic(id, body);
    return { message: 'Sujet mis à jour avec succès.' };
  }

  @Delete('forum/topics/:id')
  @ApiOperation({ summary: 'Supprimer un sujet et ses messages' })
  async deleteAdminTopic(@Param('id', ParseIntPipe) id: number) {
    await this.forumService.deleteAdminTopic(id);
    return { message: 'Sujet supprimé avec succès.' };
  }

  @Get('forum/messages')
  @ApiOperation({ summary: 'Liste des messages de forum pour modération' })
  async getAdminMessages(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('query') query?: string,
    @Query('author') author?: string,
    @Query('topicId') topicId?: number,
  ) {
    return this.forumService.getAdminMessages(page, limit, query, author, topicId);
  }

  @Put('forum/messages/:id')
  @ApiOperation({ summary: 'Modérer/modifier le contenu d’un message' })
  async updateAdminMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
  ) {
    await this.forumService.updateAdminMessage(id, body.content);
    return { message: 'Message modéré avec succès.' };
  }

  @Delete('forum/messages/:id')
  @ApiOperation({ summary: 'Supprimer un message' })
  async deleteAdminMessage(@Param('id', ParseIntPipe) id: number) {
    await this.forumService.deleteAdminMessage(id);
    return { message: 'Message supprimé avec succès.' };
  }

  // ---------------------------------------------------------------------------
  // Sauvegardes de Base de Données (MariaDB Backups)
  // ---------------------------------------------------------------------------

  @Get('backups')
  @ApiOperation({ summary: 'Liste et métriques des sauvegardes de la base de données' })
  async getBackups() {
    return this.backupService.getBackups();
  }

  @Post('backups/trigger')
  @ApiOperation({ summary: 'Déclencher une sauvegarde manuelle immédiate' })
  async triggerBackup(@Body() body: { type?: 'manual' | 'daily' | 'hourly' }) {
    const backup = await this.backupService.createManualBackup(body?.type || 'manual');
    return {
      success: true,
      message: `Sauvegarde ${backup.filename} (${backup.sizeFormatted}) générée avec succès.`,
      backup,
    };
  }

  @Get('backups/download/:filename')
  @ApiOperation({ summary: 'Télécharger une archive de sauvegarde de base de données' })
  async downloadBackup(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    const filePath = this.backupService.getBackupFilePath(filename);
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', filename.endsWith('.gz') ? 'application/gzip' : 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
