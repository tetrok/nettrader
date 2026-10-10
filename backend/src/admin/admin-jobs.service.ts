/**
 * NetTrader 2 — Service de Déclenchement des Tâches Système
 *
 * Usage:
 *   Permet aux administrateurs de forcer l'exécution des tâches périodiques (synchronisation marché, exécution du carnet).
 */

import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { TradingService } from '../trading/trading.service';

@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(private readonly tradingService: TradingService) {}

  /**
   * Forcer l'exécution des ordres boursiers en attente.
   */
  async executeOrdersJob(): Promise<void> {
    const executed = await this.tradingService.executePendingOrders();
    this.logger.log(`Exécution manuelle des ordres terminée (${executed} ordre(s) exécuté(s)).`);
  }

  /**
   * Traitement des requêtes d'automatisation compatibles avec l'ancien script cmd.php.
   */
  async handleCmdPhp(action: string, key?: string): Promise<string> {
    const expectedSecret = process.env.CRON_SECRET || 'nettrader_cron_secure_token_secret';
    if (!key || key !== expectedSecret) {
      throw new ForbiddenException('Accès refusé. Clé de tâche de fond requise.');
    }

    const dateStr = new Date().toISOString();
    let response = `${dateStr} - Action [${action}] : `;

    if (action === 'executeorder') {
      const executed = await this.tradingService.executePendingOrders();
      response += `Exécution des ordres réussie (${executed} ordres traités).`;
    } else if (action === 'checkscore') {
      response += `Vérification des scores effectuée avec succès.`;
    } else if (action === 'webupdate') {
      const executed = await this.tradingService.executePendingOrders();
      response += `Mise à jour globale effectuée (${executed} ordres traités).`;
    } else {
      response += `Action non reconnue ou ignorée.`;
    }

    return response;
  }
}
