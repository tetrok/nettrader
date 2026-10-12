/**
 * NetTrader 2 — Planificateur Automatique de Synchronisation des Marchés
 *
 * Usage:
 *   Planifie et cadence la mise à jour des cours de bourse et le déclenchement immédiat de l'exécution des ordres.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketSyncService } from './market-sync.service';
import { TradingService } from '../trading/trading.service';
import { MarketService } from '../market/market.service';

@Injectable()
export class MarketSyncScheduler {
  private readonly logger = new Logger(MarketSyncScheduler.name);
  private isRunning = false;

  constructor(
    private readonly marketSyncService: MarketSyncService,
    private readonly tradingService: TradingService,
    private readonly marketService: MarketService,
  ) {}

  /**
   * Synchronisation boursière cadencée toutes les 2 minutes pendant les heures ouvrées Euronext.
   * Cadence : du lundi au vendredi, de 9h00 à 17h40 (heure de Paris).
   */
  @Cron('*/2 9-17 * * 1-5', { timeZone: 'Europe/Paris' })
  async handleMarketSync(): Promise<void> {
    const shouldRun = this.marketService.isMarketOpen() || process.env.IGNORE_MARKET_HOURS === '1';
    if (!shouldRun) {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Cycle de synchronisation précédent toujours en cours, tour ignoré.');
      return;
    }

    this.isRunning = true;
    try {
      this.logger.log('Démarrage automatique du cycle de synchronisation des cotations...');
      const result = await this.marketSyncService.syncQuotes();
      this.logger.log(
        `Synchronisation terminée : ${result.successCount} succès, ${result.errorCount} erreurs (${result.durationSeconds}s).`,
      );

      // Exécution immédiate du carnet d'ordres dès que les prix sont rafraîchis
      const executed = await this.tradingService.executePendingOrders();
      if (executed > 0) {
        this.logger.log(`Carnet d'ordres traité : ${executed} ordre(s) exécuté(s).`);
      }
    } catch (err) {
      this.logger.error(`Erreur lors du cycle automatique de synchronisation : ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
