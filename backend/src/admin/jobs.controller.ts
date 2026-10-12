/**
 * NetTrader 2 — Contrôleur REST d'Automatisation Système (Jobs)
 *
 * Usage:
 *   Remplace l'ancienne route cmd.php par des endpoints REST sécurisés via en-tête standard X-Cron-Key.
 */

import { Controller, Post, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { AdminJobsService } from './admin-jobs.service';
import { MarketSyncService } from './market-sync.service';

@ApiTags('Admin Jobs')
@Controller('admin/jobs')
export class JobsController {
  constructor(
    private readonly jobsService: AdminJobsService,
    private readonly marketSyncService: MarketSyncService,
  ) {}

  @Post('execute-orders')
  @HttpCode(200)
  @ApiOperation({ summary: 'Déclencher l\'exécution des ordres en attente' })
  @ApiHeader({ name: 'x-cron-key', description: 'Clé secrète de tâche de fond', required: true })
  async executeOrders(@Headers('x-cron-key') cronKey: string) {
    this.jobsService.validateCronKey(cronKey);
    const executed = await this.jobsService.executeOrdersJob();
    return {
      success: true,
      executedCount: executed,
      message: `Exécution réussie : ${executed} ordre(s) traité(s).`,
    };
  }

  @Post('sync-market')
  @HttpCode(200)
  @ApiOperation({ summary: 'Déclencher un cycle de synchronisation des cotations' })
  @ApiHeader({ name: 'x-cron-key', description: 'Clé secrète de tâche de fond', required: true })
  async syncMarket(@Headers('x-cron-key') cronKey: string) {
    this.jobsService.validateCronKey(cronKey);
    const result = await this.marketSyncService.syncQuotes();
    const executed = await this.jobsService.executeOrdersJob();
    return {
      success: true,
      sync: result,
      ordersExecuted: executed,
      message: `Synchronisation terminée : ${result.successCount} succès, ${result.errorCount} erreurs, ${executed} ordre(s) exécuté(s).`,
    };
  }
}
